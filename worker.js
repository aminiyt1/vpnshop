// file seller telegram bot

/*
Telegram : t.me/asrnovin_ir

go to D1->Console and run these 3 sql to create tables

CREATE TABLE files ( id INTEGER PRIMARY KEY AUTOINCREMENT, message_id TEXT NOT NULL, from_chat_id TEXT NOT NULL, caption TEXT NOT NULL, price INTEGER NOT NULL );

CREATE TABLE orders ( id INTEGER PRIMARY KEY AUTOINCREMENT, userid TEXT NOT NULL, fileid INTEGER NOT NULL, status INTEGER NOT NULL DEFAULT 0, random_key TEXT NOT NULL, payment_data TEXT NOT NULL DEFAULT '{}' , payMsg TEXT);

CREATE TABLE [payment_history] ("id" integer PRIMARY KEY,"order_id" integer,"payment_data" text,"payment_date" text);

*/

const BOT_TOKEN = 'TokenBot'; // token robot az bot father
const ZARINPAL_MERCHANT_ID = 'merchantidzarinpal'; // az zarinpal begirid
const ADMINS = ["asrnovin_ir", "admin2"]; // ID admin ha bedone @
const BOT_ID = "username_bot"; // ID robot bedone @
const TIME_ZONE = "Asia/Tehran"; // time zone baraye payment hisotry
const ZARINPAL_TEST_MODE = true; // test it with sandbox

export default {
  async fetch(request, env, ctx) {
    const url = new URL(request.url);

    const botValues = env.bot_values_link; // create a KV and bind to your worker -> bot_values_link
    const botDB = env.dblink; // create a D1 database and bind it to your worker -> dblink

    async function postReq(url, fields) {
      const tgFormData = new FormData();

      fields.forEach(obj => {
        for (let key in obj) {
          tgFormData.append(key, obj[key]);
        }
      });

      const telegramResponse = await fetch(`https://api.telegram.org/bot${BOT_TOKEN}/${url}`, {
        method: 'POST',
        body: tgFormData,
      });

      return await telegramResponse;
    }


    function engNumber(input) {
      let inputString = String(input);

      let persianToEnglish = inputString.replace(/[\u06F0-\u06F9]/g, (digit) =>
        String.fromCharCode(digit.charCodeAt(0) - 1728)
      );

      let arabicToEnglish = persianToEnglish.replace(/[\u0660-\u0669]/g, (digit) =>
        String.fromCharCode(digit.charCodeAt(0) - 1584)
      );

      let numericString = arabicToEnglish.replace(/\D/g, '');

      return parseInt(numericString, 10);
    }


    function toFarsiNumberFormat(input) {

      let inputString = String(input);

      let formattedNumber = inputString.replace(/\B(?=(\d{3})+(?!\d))/g, '،');

      let farsiNumber = formattedNumber.replace(/\d/g, (digit) =>
        String.fromCharCode(digit.charCodeAt(0) + 1728)
      );

      return farsiNumber;
    }


    // Check if the path is /init
    if (url.pathname === "/init") {
      try {
        // Call the Telegram API to set the webhook

        const array = new Uint8Array(32);
        crypto.getRandomValues(array);
        const webhookkey = Array.from(array, byte => byte.toString(16).padStart(2, '0')).join('');
        await botValues.put("webhookkey", webhookkey)

        const response = await fetch(`https://api.telegram.org/bot${BOT_TOKEN}/setWebhook`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            url: `${url.protocol}//${url.hostname}/hook/${webhookkey}` // Use the current Worker URL
          })
        });

        // Check if the response from Telegram is successful
        const result = await response.json();
        if (result.ok) {
          return new Response("Webhook successfully set!", { status: 200 });
        } else {
          return new Response(`Failed to set webhook: ${result.description}`, { status: 400 });
        }
      } catch (error) {
        return new Response(`Error setting webhook: ${error.message}`, { status: 500 });
      }
    }






    if (url.pathname.startsWith("/order")) {

      const url = new URL(request.url);

      const orderid = url.searchParams.get('id');
      const rkey = url.searchParams.get('key');

      const requestOrder = await botDB.prepare(`SELECT * FROM orders WHERE id = ?`).bind(orderid).first();

      if (rkey == requestOrder.random_key) {

        const orderedfile = await botDB.prepare(`SELECT * FROM files WHERE id = ?`).bind(requestOrder.fileid).first();

        /*ZarinPal*/
        const headers = {
          "accept": "application/json",
          "content-type": "application/json",
        };

        const body = JSON.stringify({
          merchant_id: ZARINPAL_MERCHANT_ID,
          amount: orderedfile.price * 10,
          description: "order " + orderedfile.title,
          callback_url: `${url.protocol}//${url.hostname}/verify/?orderid=${orderid}&key=${requestOrder.random_key}`
        });


        const zarinpal_request_url = ZARINPAL_TEST_MODE
          ? "https://sandbox.zarinpal.com/pg/v4/payment/request.json"
          : "https://api.zarinpal.com/pg/v4/payment/request.json";

        const zarinpal_req_pay_response = await fetch(zarinpal_request_url, {
          method: "POST",
          headers,
          body,
        });

        const zarinpal_req_pay_result = await zarinpal_req_pay_response.json();


        await botDB.prepare(`UPDATE orders SET payment_data = ? where id = ?`).bind(
          JSON.stringify({
            bank: "zarinpal",
            authority: zarinpal_req_pay_result.data.authority,
            amount: orderedfile.price * 10
          }),
          requestOrder.id,
        ).run();



        const zarinpal_payURL = ZARINPAL_TEST_MODE
          ? `https://sandbox.zarinpal.com/pg/StartPay/${zarinpal_req_pay_result.data.authority}`
          : `https://www.zarinpal.com/pg/StartPay/${zarinpal_req_pay_result.data.authority}`

        const redirectingPage = `<!DOCTYPE html>
        <html lang="en">
        <head>
            <meta charset="UTF-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
            <title>پرداخت</title>
            <style>
                body {
                    margin: 0;
                    height: 100vh;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    font-family: Arial, sans-serif;
                    background-color: #121212;
                    color: #ffffff;
                }
                .container {
                    text-align: center;
                    max-width: 400px;
                    width: 100%;
                    padding: 20px;
                    border-radius: 10px;
                    background-color: #1e1e1e;
                    box-shadow: 0 4px 10px rgba(0, 0, 0, 0.7);
                    position: relative;
                }
                .close-button {
                    position: absolute;
                    top: 10px;
                    right: 10px;
                    background-color: #d9534f;
                    color: #ffffff;
                    border: none;
                    border-radius: 50%;
                    width: 30px;
                    height: 30px;
                    font-size: 18px;
                    font-weight: bold;
                    text-align: center;
                    line-height: 30px;
                    cursor: pointer;
                    transition: background-color 0.3s ease;
                    padding:0px
                }
                .close-button:hover {
                    background-color: #c9302c;
                }
                input {
                    width: 100%;
                    padding: 10px;
                    border-radius: 5px;
                    border: 1px solid #333;
                    background-color: #2e2e2e;
                    color: #ffffff;
                    margin-bottom: 10px;
                    text-align: center;
                    cursor: pointer;
                }
                button {
                    padding: 10px 20px;
                    border: none;
                    border-radius: 5px;
                    background-color: #3a7bd5;
                    color: #ffffff;
                    cursor: pointer;
                    font-size: 16px;
                }
                button:hover {
                    background-color: #2a68b1;
                }
                p {
                    font-size: 14px;
                    color: #cccccc;
                }
                .copy-message {
                    position: absolute;
                    top: -30px;
                    left: 50%;
                    transform: translateX(-50%);
                    background-color: #28a745;
                    color: #ffffff;
                    padding: 5px 10px;
                    border-radius: 5px;
                    font-size: 12px;
                    display: none;
                }
            </style>
        </head>
        <body>
        <script>
        function cw() {

          try {
               window.TelegramWebviewProxy.postEvent('web_app_close', null);
           } catch (error) {
               console.error('Error posting event to Telegram Webview:', error);
           }
             
           }

        </script>
            <div class="container">
                <button class="close-button" onclick="cw()">X</button>
                <div id="copy-message" class="copy-message">Copied!</div>
                <h1>پرداخت</h1>
                <input type="text" id="payment-url" value="${zarinpal_payURL}" readonly onclick="copyToClipboard()">
                <p>شما می‌توانید این لینک را در مرورگر خارجی کپی کنید.</p>
                <p>(بزن روش کپی میشه)</p>
                <button onclick="continuePayment()">ادامه پرداخت همینجا</button>
            </div>
            <script>
                function copyToClipboard() {
                    const input = document.getElementById('payment-url');
                    input.select();
                    input.setSelectionRange(0, 99999); // For mobile devices
                    navigator.clipboard.writeText(input.value).then(() => {
                        showCopyMessage();
                    });
                }
        
                function showCopyMessage() {
                    const message = document.getElementById('copy-message');
                    message.style.display = 'block';
                    setTimeout(() => {
                        message.style.display = 'none';
                    }, 1500);
                }
        
                function continuePayment() {
                    const url = document.getElementById('payment-url').value;
                    window.location.href = url;
                }
            </script>
        </body>
        </html>
        `;


        return new Response(redirectingPage, {
          status: 200,
          headers: {
            "Content-Type": "text/html",
            "Cache-Control": "no-store, no-cache, must-revalidate, proxy-revalidate, max-age=0",
            "Pragma": "no-cache",
            "Expires": "0",
          },
        });

        /*end of ZarinPal*/

      }

    }


    if (url.pathname.startsWith("/verify")) {

      const orderid = url.searchParams.get('orderid');
      const rkey = url.searchParams.get('key');
      const Authority = url.searchParams.get('Authority');

      const verifyingOrder = await botDB.prepare(`SELECT * FROM orders WHERE id = ?`).bind(orderid).first();

      var sendit = 0;

      if (rkey == verifyingOrder.random_key) {

        const payment_data = JSON.parse(verifyingOrder.payment_data)

        if (payment_data.bank == 'zarinpal') {

          const headers = {
            "accept": "application/json",
            "content-type": "application/json",
          };

          const body = JSON.stringify({
            merchant_id: ZARINPAL_MERCHANT_ID,
            authority: payment_data.authority,
            amount: payment_data.amount,
          });

          const zarinpal_verifyURL = ZARINPAL_TEST_MODE
            ? `https://sandbox.zarinpal.com/pg/v4/payment/verify.json`
            : `https://api.zarinpal.com/pg/v4/payment/verify.json`

          const zarinpalVerifyResponse = await fetch(zarinpal_verifyURL, {
            method: "POST",
            headers,
            body,
          });


          const zarinpalVerifyResponseJson = await zarinpalVerifyResponse.json();

          const payDate = new Intl.DateTimeFormat('en-US', {
            timeZone: TIME_ZONE,
            dateStyle: 'full',
            timeStyle: 'long',
          }).format(new Date());

          const insertNewFile = await botDB.prepare(`INSERT INTO payment_history (order_id, payment_data, payment_date)
          VALUES (?1, ?2, ?3)`).bind(
            orderid,
            String(JSON.stringify(zarinpalVerifyResponseJson)),
            String(payDate)
          ).run();



          if (zarinpalVerifyResponseJson.data.code == 100) {
            sendit = 1;

            await postReq(`editMessageReplyMarkup`, [
              { "chat_id": verifyingOrder.userid },
              { "message_id": verifyingOrder.payMsg },

              {
                "reply_markup": JSON.stringify({
                  "inline_keyboard": [
                    [
                      {
                        "text": "✅ پرداخت شد",
                        "url": `https://t.me/${BOT_ID}`
                      }
                    ]
                  ]
                })
              }
            ]);

            await botDB.prepare(`UPDATE orders SET status = ? where id = ?`).bind(
              1,
              orderid,
            ).run();

          } else if (zarinpalVerifyResponseJson.data.code == 101) {
            sendit = 2;
          }


        }


        const htmlPage = `<!DOCTYPE html>
          <html lang="en">
          <head>
            <meta charset="UTF-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
            <title>[PAGE_TITLE]</title>
            <style>
              body {
                background-color: #121212;
                color: #ffffff;
                font-family: Arial, sans-serif;
                display: flex;
                justify-content: center;
                align-items: center;
                height: 100vh;
                margin: 0;
                text-align: center;
                flex-direction: column;
                direction:rtl
              }
              h1, h2 {
                margin: 0;
              }
              h1 {
                font-size: 2em;
                margin-bottom: 0.5em;
              }
              h2 {
                font-size: 1.5em;
                font-weight: normal;
                margin-bottom: 1em;
              }
              a {
                display: inline-block;
                padding: 0.5em 1em;
                color: #ffffff;
                background-color: #007bff;
                text-decoration: none;
                border-radius: 5px;
                font-size: 1em;
                margin-top: 1em;
              }
              a:hover {
                background-color: #0056b3;
              }
              #countdowncontainer {
                font-size:1.5rem;            
              }
              #countdown {
                font-weight:bold;
                color:#ff00a5;
                font-size:1.8rem
              }
            </style>
          </head>
          <body>
            [BODY]

          <div>
          <script>
          function cw() {

         try {
              window.TelegramWebviewProxy.postEvent('web_app_close', null);
          } catch (error) {
              console.error('Error posting event to Telegram Webview:', error);
          }
            
          }
          </script>

          <p id="countdowncontainer">انتقال به تلگرام در <span id="countdown">8</span> ثانیه...</p>
           <div> <a onclick="cw()" href="tg://resolve?domain=${BOT_ID}">بازگشت به تلگرام</a> </div>       

          </div>
          
          <script>
          let countdown = 8; // 8 seconds
          const countdownElement = document.getElementById("countdown");
          
          const interval = setInterval(() => {
            countdown -= 1;
            countdownElement.textContent = countdown;
            if (countdown <= 0) {
              clearInterval(interval);
              cw();
              window.location.href = "tg://resolve?domain=${BOT_ID}";
            }
          }, 1000); // Update every 1 second
        </script>
         

          </body>
          </html>`;


        if (sendit === 1) {


          const filexx = await botDB.prepare(`SELECT * FROM files WHERE id = ?`).bind(verifyingOrder.fileid).first();

          await postReq(`copyMessage`, [
            { "chat_id": verifyingOrder.userid },
            { "from_chat_id": filexx.from_chat_id },
            { "message_id": filexx.message_id }
          ])




          return new Response(htmlPage.replace("[BODY]", `<div>
          <h1>✅پرداخت شد</h1>
          <h2>✅فایل ارسال شد</h2>
          </div>`).replace("[PAGE_TITLE]", "پرداخت شد"), {
            status: 200,
            headers: {
              'Content-Type': 'text/html; charset=UTF-8',
            }
          });




        } else if (sendit === 2) {
          return new Response(htmlPage.replace("[BODY]", `
          <div> <h1>❎فایل قبلا ارسال شده است</h1></div>
        `).replace("[PAGE_TITLE]", "فایل قبلا ارسال شده"), {
            status: 200,
            headers: {
              'Content-Type': 'text/html; charset=UTF-8',
            }
          });
        } else {
          return new Response(htmlPage.replace("[BODY]", `
          <div><h1>❌خطا: پرداخت نشد</h1></div>
          `).replace("[PAGE_TITLE]", "خطا در پرداخت"), {
            status: 200,
            headers: {
              'Content-Type': 'text/html; charset=UTF-8',
            }
          });

        }


      }

    }



    if (url.pathname.startsWith("/hook")) {

      const reqHook = url.pathname.split('/hook/')[1];

      if (reqHook == await botValues.get("webhookkey")) {

        if (request.method === "POST") {

          try {

            const body = await request.json();

            if (body.message) {
              const chatId = body.message.chat.id;

              if (ADMINS.includes(body.message.chat.username)) {

                await postReq(`setMyCommands`, [
                  {
                    "scope": JSON.stringify({
                      type: 'chat', // Scope type (e.g., 'chat', 'default', 'chat_member')
                      chat_id: chatId // Chat ID where commands apply
                    })
                  },
                  { "commands": JSON.stringify([{ command: '/newfile', description: 'فایل جدید' }]) }])


                const setAct = async (act) => {
                  await botValues.put("action_" + chatId, JSON.stringify(act))
                }


                if (body.message.text == '/newfile') {

                  await postReq(`sendMessage`, [
                    { "chat_id": chatId },
                    { "text": "یک فایل ارسال کنید" },])
                  await setAct({ "act": "wait_for_newfile" });

                } else if (('text' in body.message && !body.message.text.startsWith("/start")) || !('text' in body.message)) {

                  try {

                    const command = JSON.parse(await env.bot_values_link.get("action_" + chatId))

                    if (command.act == "wait_for_newfile") {

                      command["message_id"] = body.message.message_id
                      command["act"] = "wait_for_title"

                      await setAct(command);

                      await postReq(`sendMessage`, [
                        { "chat_id": chatId },
                        { "text": "عنوان را بنویس" },
                      ])

                    } else if (command.act == "wait_for_title") {


                      if ('caption' in body.message) {
                        command["caption"] = {
                          type: "file_with_caption",
                          message_id: body.message.message_id,
                          text: body.message.caption
                        }
                      } else if ('text' in body.message) {
                        command["caption"] = {
                          type: "text",
                          text: body.message.text
                        }
                      } else {
                        command["caption"] = {
                          type: "file_without_caption",
                          message_id: body.message.message_id,
                          text: ""
                        }
                      }

                      command["act"] = "wait_for_price"



                      await setAct(command);

                      await postReq(`sendMessage`, [
                        { "chat_id": chatId },
                        { "text": "قیمت را به تومان وارد کن" }])

                    } else if (command.act == "wait_for_price") {

                      const price = body.message.text;
                      const insertNewFile = await botDB.prepare(`INSERT INTO files (message_id, from_chat_id, caption, price)
                  VALUES (?1, ?2, ?3, ?4)`).bind(
                        String(command["message_id"]),
                        String(chatId),
                        String(JSON.stringify(command["caption"])),
                        engNumber(price)
                      ).run();



                      const postCaption = command["caption"]['text'] + "\n\n <b>قیمت: " + toFarsiNumberFormat(engNumber(price)) + " تومان" + "</b>\n\nㅤ"

                      const buyBtn = JSON.stringify({
                        "inline_keyboard": [
                          [
                            {
                              "text": "خرید فایل",
                              "url": `https://t.me/${BOT_ID}?start=${insertNewFile.meta.last_row_id}`
                            }
                          ]
                        ]
                      });

                      if (command["caption"]['type'] == 'text') {

                        await postReq(`sendMessage`, [
                          { "chat_id": chatId },
                          { "parse_mode": "html" },
                          { "text": postCaption },
                          { "reply_markup": buyBtn }
                        ]);

                      } else {
                        await postReq(`copyMessage`, [
                          { "chat_id": chatId },
                          { "from_chat_id": chatId },
                          { "parse_mode": "html" },
                          { "caption": postCaption },
                          { "message_id": command["caption"]["message_id"] },
                          { "reply_markup": buyBtn }
                        ]);
                      }

                      await setAct({ "act": "idle" });

                    }

                  } catch (e) {

                  }

                }

              }


              if (body.message.text.startsWith("/start")) {

                const fileid = body.message.text.match(/\/start (\w+)/)[1];
                const requestFile = await botDB.prepare(`SELECT * FROM files WHERE id = ?`).bind(fileid).first();

                const array = new Uint8Array(8);
                crypto.getRandomValues(array);
                const rndKey = Array.from(array, byte => byte.toString(16).padStart(2, '0')).join('');

                const insertOrder = await botDB.prepare(`INSERT INTO orders (userid,fileid,random_key) VALUES (?1, ?2, ?3)`).bind(
                  String(chatId),
                  requestFile.id,
                  rndKey
                ).run();

                const requestFileCaption = JSON.parse(requestFile.caption);
                const Caption = requestFileCaption['text'] + "\n قیمت: " + toFarsiNumberFormat(requestFile.price) + " تومان"

                const payBtn = JSON.stringify({
                  "inline_keyboard": [
                    [
                      {
                        "text": "پرداخت آنلاین",
                        "web_app": {
                          "url": url.protocol + "//" + url.hostname + "/order/?id=" + insertOrder.meta.last_row_id + "&key=" + rndKey
                        }
                      }
                    ]
                  ]
                })


                let payMsgResponse = null;

                if (requestFileCaption['type'] == 'text') {

                  payMsgResponse = await postReq(`sendMessage`, [
                    { "chat_id": chatId },
                    { "text": Caption },
                    { "reply_markup": payBtn }
                  ]);

                } else {
                  payMsgResponse = await postReq(`copyMessage`, [
                    { "chat_id": chatId },
                    { "from_chat_id": requestFile["from_chat_id"] },
                    { "caption": Caption },
                    { "message_id": requestFileCaption["message_id"] },
                    { "reply_markup": payBtn }
                  ]);
                }




                const payMsgResponseJson = await payMsgResponse.json();


                await botDB.prepare(`UPDATE orders SET payMsg = ? where id = ?`).bind(
                  String(payMsgResponseJson.result.message_id),
                  insertOrder.meta.last_row_id,
                ).run();

              }

            }

          }
          catch (e) {
            // a big try catch to prevent pending :D
          }
        }
        return new Response("", { status: 200 });
      } else {
        return new Response("wrong webhook", { status: 200 });
      }
    }

    return new Response("ok", { status: 200 });

  }
};
