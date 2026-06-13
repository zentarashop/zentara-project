# Instagram MCP — วิธีติดตั้ง

## สิ่งที่ได้จาก server นี้
- **ig_get_profile** — followers, media count, bio
- **ig_get_profile_insights** — reach, impressions, profile views รายวัน/สัปดาห์/เดือน
- **ig_get_media_list** — รายการโพสต์ทั้งหมดพร้อม likes/comments
- **ig_get_post_insights** — insights ละเอียดแต่ละโพสต์ (reach, saves, shares, plays)
- **ig_get_top_posts** — top posts จัดอันดับตาม metric ที่เลือก
- **ig_get_audience_insights** — อายุ, เพศ, เมือง, ประเทศของ audience

---

## ขั้นตอนที่ 1: สร้าง Meta Developer App

1. ไปที่ https://developers.facebook.com
2. คลิก **My Apps → Create App**
3. เลือก **Business** → ตั้งชื่อ "ZENTARA Instagram"
4. เพิ่ม Product: **Instagram Graph API**
5. ใน App Settings → Basic → copy **App ID** และ **App Secret**

---

## ขั้นตอนที่ 2: เชื่อม Facebook Page กับ Instagram

- IG @zentara_shop ต้องเป็น **Professional/Business account**
- ต้องเชื่อมกับ **Facebook Page** ของแบรนด์ก่อน
  - ไปที่ IG Settings → Account type and tools → Switch to Professional
  - เชื่อม Facebook Page: Settings → Linked accounts

---

## ขั้นตอนที่ 3: หา Instagram User ID

1. ไปที่ Graph API Explorer: https://developers.facebook.com/tools/explorer
2. เลือก App ที่สร้าง
3. กด **Generate Access Token** — tick permission:
   - `instagram_basic`
   - `instagram_manage_insights`
   - `pages_read_engagement`
   - `pages_show_list`
4. ใน Query field พิมพ์: `me/accounts` → กด Submit
5. จะได้ Page ID → copy ไว้
6. พิมพ์ต่อ: `{PAGE_ID}?fields=instagram_business_account` → Submit
7. จะได้ `instagram_business_account.id` — นี่คือ **IG_USER_ID**

---

## ขั้นตอนที่ 4: สร้าง Long-Lived Access Token

Access token จาก Explorer หมดใน 1 ชั่วโมง ต้องแปลงเป็น long-lived (60 วัน):

```
GET https://graph.facebook.com/oauth/access_token
  ?grant_type=fb_exchange_token
  &client_id={APP_ID}
  &client_secret={APP_SECRET}
  &fb_exchange_token={SHORT_TOKEN}
```

วางใน browser หรือ Postman → จะได้ long-lived token

---

## ขั้นตอนที่ 5: ติดตั้ง dependencies

```bash
pip install mcp httpx pydantic
```

---

## ขั้นตอนที่ 6: ตั้งค่า Environment Variables

สร้างไฟล์ `.env` ในโฟลเดอร์ instagram-mcp:

```
IG_ACCESS_TOKEN=your_long_lived_token_here
IG_USER_ID=your_ig_business_account_id_here
```

หรือตั้งใน system environment ก็ได้

---

## ขั้นตอนที่ 7: ติดตั้งใน Cowork

1. ไปที่ **Settings → Capabilities → MCP Servers → Add**
2. เลือก **stdio**
3. Command: `python`
4. Args: `/path/to/instagram-mcp/instagram_mcp.py`
5. Environment:
   - `IG_ACCESS_TOKEN` = token ที่ได้
   - `IG_USER_ID` = IG user ID ที่ได้

---

## หมายเหตุ

- Long-lived token หมดทุก 60 วัน ต้อง refresh ใหม่
- ถ้าอยู่ใน **Development mode** ดึงได้เฉพาะ account ตัวเอง (เพียงพอสำหรับ ZENTARA)
- Audience demographics ต้องมี follower อย่างน้อย 100 คน
