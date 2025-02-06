# vpnshop
ربات تلگرامی فروش فایل روی ورکر کلودفلر
**آموزش کامل نصب متنی:** 

ابتدا در سایت کلودفلر یک حساب کاربری با ایمیل واقعی ایجاد کنید
1.یه ربات توی باتفادر **@botfather** میسازی و توکن برای **BOT_TOKEN** قرار میدی
2.برای **ZARINPAL_MERCHAND_ID** از زرین پال میگیری (https://www.zarinpal.com) البته برای تست میتونی از merchant_id غیر واقعی هم استفاده کنی و در این حالت باید **ZARINPAL_TEST_MODE** روی **true** باشه (که دیفالتش همینه) وقتی تست رو انجام دادی بزارش روی حالت **false**
3.قسمت **ADMINS** هم باید آی دی ادمین ها یعنی کسایی که میتونن فایل برای فروش ارسال کنن بذاری بدون @
4.برای **BOT_ID** هم آی دی رباتت رو باید بدی بدون @
5.بعد از قسمت **Storage & Databases** میری یکدونه **KV** میسازی و یدونه **D1 SQL Database** (اسمشون اختیاری هست)
6.بعد میری توی **Settings** ورکری که ساختی و توی **Bindings** بایندشون میکنی به ورکرت : KV با اسم **bot_values_link** و D1 SQL Database با اسم **dblink**
7.بعد میری توی دیتابیس و توی تب **console** 

# این سه خط کامل پیست میکنی و execute میزنی: 
```CREATE TABLE files ( id INTEGER PRIMARY KEY AUTOINCREMENT, message_id TEXT NOT NULL, from_chat_id TEXT NOT NULL, caption TEXT NOT NULL, price INTEGER NOT NULL );

CREATE TABLE orders ( id INTEGER PRIMARY KEY AUTOINCREMENT, userid TEXT NOT NULL, fileid INTEGER NOT NULL, status INTEGER NOT NULL DEFAULT 0, random_key TEXT NOT NULL, payment_data TEXT NOT NULL DEFAULT '{}' , payMsg TEXT);

CREATE TABLE [payment_history] ("id" integer PRIMARY KEY,"order_id" integer,"payment_data" text,"payment_date" text);

```
8.ورکر توی مرورگر باز میکنی و میزنی **/init** اخر آدرس و اینتر میزنی تا وبهوک ست بشه

حالا رباتتو استارت میکنی و از منو کامند **newfile** برات میاد (اگه توی ADMINS آیدی تلگرام خودتو وارد کرده باشی)
کامند **newfile** میزنی و فایل ارسال میکنی و برات میسازه و برای هرجا بفرستی میتونه پرداخت کنه و فایل بگیره و پولش میاد تو جیبت !
