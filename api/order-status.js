export default async function handler(req,res){
  res.setHeader("Cache-Control","no-store, no-cache, must-revalidate, proxy-revalidate");
  res.setHeader("Pragma","no-cache");
  res.setHeader("Vary","Origin");
  const allowedOrigins=new Set(["https://hummiebear.be","https://www.hummiebear.be","https://humiebear.vercel.app"]);
  const origin=req.headers.origin;
  if(origin&&allowedOrigins.has(origin))res.setHeader("Access-Control-Allow-Origin",origin);
  if(req.method==="OPTIONS"){
    res.setHeader("Access-Control-Allow-Methods","GET,OPTIONS");
    res.setHeader("Access-Control-Allow-Headers","Accept");
    return res.status(204).end();
  }
  if(req.method!=="GET"){res.setHeader("Allow","GET, OPTIONS");return res.status(405).json({error:"Method not allowed"});}
  const orderNumber=String(req.query?.order||"").trim();
  if(!orderNumber||orderNumber.length>100||!/^[A-Za-z0-9_-]+$/.test(orderNumber))return res.status(400).json({error:"Invalid order number"});
  const supabaseUrl="https://yrcajvpstbyupohjbavm.supabase.co";
  const supabaseKey=process.env.SUPABASE_SERVICE_ROLE_KEY;
  const mollieKey=process.env.MOLLIE_API_KEY;
  if(!supabaseKey||!mollieKey)return res.status(500).json({error:"Payment status is not configured"});
  try{
    const dbResponse=await fetch(supabaseUrl+"/rest/v1/orders?select=order_number,total,payment_reference,payment_status&order_number=eq."+encodeURIComponent(orderNumber)+"&limit=1",{
      headers:{apikey:supabaseKey,Authorization:"Bearer "+supabaseKey,Accept:"application/json"}
    });
    if(!dbResponse.ok)return res.status(502).json({error:"Could not check order"});
    const rows=await dbResponse.json();
    const order=Array.isArray(rows)?rows[0]:null;
    if(!order)return res.status(404).json({error:"Order not found"});
    if(!order.payment_reference)return res.status(200).json({paid:false});
    const paymentResponse=await fetch("https://api.mollie.com/v2/payments/"+encodeURIComponent(String(order.payment_reference)),{
      headers:{Authorization:"Bearer "+mollieKey,Accept:"application/json"}
    });
    if(!paymentResponse.ok)return res.status(502).json({error:"Could not verify payment"});
    const payment=await paymentResponse.json();
    if(payment.status!=="paid")return res.status(200).json({paid:false});
    const value=Number(order.total);
    if(!Number.isFinite(value)||value<=0)return res.status(200).json({paid:false});
    return res.status(200).json({paid:true,value, currency:"EUR", transaction_id:String(order.order_number)});
  }catch(error){
    console.error("Order status check failed:",error);
    return res.status(500).json({error:"Could not verify order"});
  }
}
