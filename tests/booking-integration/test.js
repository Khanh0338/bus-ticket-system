const base = "http://localhost:4002";
const CONTACT = { contactName: "Nguyễn Văn A", contactPhone: "0912345678", contactEmail: "a@example.com" };
const call = async (method, path, userId, body) => {
  if (path === "/bookings/hold" && body && body.contactName === undefined) body = { ...CONTACT, ...body };
  const r = await fetch(base + path, { method, headers: { "Content-Type":"application/json", ...(userId ? {"x-user-id": String(userId)} : {}) }, body: body ? JSON.stringify(body) : undefined });
  return { status: r.status, body: await r.json() };
};
let pass = 0, fail = 0;
const check = (name, cond, extra="") => { cond ? pass++ : fail++; console.log((cond?"PASS":"FAIL")+" - "+name+(cond?"":"  "+extra)); };
(async () => {
  let r = await call("POST","/bookings/hold",null,{tripId:1,seatNumbers:["A1"]});
  check("hold không có x-user-id -> 401", r.status===401, JSON.stringify(r));

  r = await call("POST","/bookings/hold",1,{tripId:1,seatNumbers:["A1","A2"]});
  check("user1 giữ A1,A2 -> 201", r.status===201, JSON.stringify(r));
  const b1 = r.body.data?.id;

  r = await call("POST","/bookings/hold",2,{tripId:1,seatNumbers:["A2","A3"]});
  check("user2 giữ A2,A3 (A2 đang bị giữ) -> 409 SEAT_ALREADY_HELD", r.status===409 && r.body.error.code==="SEAT_ALREADY_HELD", JSON.stringify(r));

  r = await call("POST","/bookings/hold",2,{tripId:1,seatNumbers:["A3"]});
  check("rollback đúng: A3 không bị kẹt khóa sau lần thất bại trước -> user2 giữ A3 được", r.status===201, JSON.stringify(r));

  // race condition: 15 người cùng giữ A5
  const results = await Promise.all(Array.from({length:15},(_,i)=>call("POST","/bookings/hold",100+i,{tripId:1,seatNumbers:["A5"]})));
  const ok = results.filter(x=>x.status===201).length, conflict = results.filter(x=>x.status===409).length;
  check(`race: 15 request cùng giữ A5 -> đúng 1 thành công (thực tế ${ok} ok / ${conflict} conflict)`, ok===1 && conflict===14);

  r = await call("GET","/bookings/trips/1/seat-status");
  check("seat-status liệt kê ghế đang giữ", r.status===200 && ["A1","A2","A3","A5"].every(s=>r.body.data.held.includes(s)) && r.body.data.sold.length===0, JSON.stringify(r.body));

  r = await call("POST",`/bookings/${b1}/confirm`,2,{});
  check("user2 xác nhận đơn của user1 -> 403", r.status===403, JSON.stringify(r));
  r = await call("GET",`/bookings/${b1}`,2);
  check("user2 xem đơn của user1 -> 403", r.status===403);

  r = await call("POST",`/bookings/${b1}/confirm`,1,{});
  check("user1 thanh toán thành công -> 200 CONFIRMED + có vé", r.status===200 && r.body.data.booking.status==="CONFIRMED" && !!r.body.data.ticket.qr_code, JSON.stringify(r));

  r = await call("POST","/bookings/hold",2,{tripId:1,seatNumbers:["A1"]});
  check("BUG ĐÃ SỬA: ghế A1 đã bán, user2 không giữ lại được -> 409 SEAT_ALREADY_SOLD", r.status===409 && r.body.error.code==="SEAT_ALREADY_SOLD", JSON.stringify(r));

  r = await call("GET","/bookings/trips/1/seat-status");
  check("seat-status: A1,A2 chuyển sang 'sold'", r.body.data.sold.includes("A1") && r.body.data.sold.includes("A2") && !r.body.data.held.includes("A1"), JSON.stringify(r.body));

  r = await call("POST","/bookings/hold",3,{tripId:2,seatNumbers:["A1"]});
  check("chuyến khác (trip 2) cùng số ghế A1 vẫn giữ được", r.status===201, JSON.stringify(r));

  // nhánh compensating transaction
  r = await call("POST","/bookings/hold",4,{tripId:1,seatNumbers:["A10"]});
  const b4 = r.body.data.id;
  r = await call("POST",`/bookings/${b4}/confirm`,4,{simulateFailure:true});
  check("thanh toán thất bại -> 402 PAYMENT_FAILED", r.status===402 && r.body.error.code==="PAYMENT_FAILED", JSON.stringify(r));
  r = await call("GET",`/bookings/${b4}`,4);
  check("booking chuyển CANCELLED", r.body.data.status==="CANCELLED");
  r = await call("POST","/bookings/hold",5,{tripId:1,seatNumbers:["A10"]});
  check("compensating: A10 được nhả, người khác giữ lại được", r.status===201, JSON.stringify(r));

  r = await call("GET","/bookings/mine",1);
  check("lịch sử của user1 có 1 đơn CONFIRMED", r.status===200 && r.body.data.length===1 && r.body.data[0].status==="CONFIRMED", JSON.stringify(r.body));
  r = await call("GET","/bookings/mine");
  check("lịch sử không đăng nhập -> 401", r.status===401);

  r = await call("POST","/bookings/hold",6,{tripId:1,seatNumbers:["A20"],contactPhone:"123"});
  check("SĐT sai định dạng -> 400 INVALID_CONTACT", r.status===400 && r.body.error.code==="INVALID_CONTACT", JSON.stringify(r));
  r = await call("POST","/bookings/hold",6,{tripId:1,seatNumbers:["A20"],contactName:" "});
  check("thiếu họ tên -> 400 INVALID_CONTACT", r.status===400 && r.body.error.code==="INVALID_CONTACT", JSON.stringify(r));
  r = await call("POST","/bookings/hold",6,{tripId:1,seatNumbers:["A20"],contactEmail:"khong-phai-email"});
  check("email sai -> 400 INVALID_CONTACT", r.status===400 && r.body.error.code==="INVALID_CONTACT", JSON.stringify(r));
  r = await call("POST","/bookings/hold",6,{tripId:1,seatNumbers:["A20"]});
  check("thông tin liên hệ hợp lệ được lưu cùng đơn", r.status===201 && r.body.data.contact_name==="Nguyễn Văn A" && r.body.data.contact_phone==="0912345678", JSON.stringify(r));
  console.log(`\n${pass} pass, ${fail} fail`);
  process.exit(fail?1:0);
})();
