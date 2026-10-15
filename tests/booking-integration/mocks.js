const express = require("express");
function mk(port, setup){ const a=express(); a.use(express.json()); setup(a); a.listen(port); }
mk(5001, a => a.get("/trips/:id", (q,r)=>r.json({data:{id:+q.params.id, price:250000}})));
mk(5003, a => a.post("/payments", (q,r)=> q.body.simulateFailure ? r.status(402).json({error:{code:"PAYMENT_FAILED",message:"Thanh toán thất bại (mô phỏng)"}}) : r.json({data:{status:"SUCCESS"}})));
mk(5004, a => a.post("/tickets/issue", (q,r)=>r.status(201).json({data:{qr_code:"QR-test-"+q.body.bookingId.slice(0,6)}})));
mk(5005, a => a.get("/users/:id", (q,r)=>r.json({data:{email:"u@x.com", fullName:"U"+q.params.id}})));
mk(5006, a => a.post("/notifications/send", (q,r)=>r.status(202).json({data:{status:"SENT"}})));
