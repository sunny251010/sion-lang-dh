# Sion Lang DH

Website tinh gon de ho tro chuan bi sinh hoat Sabat. Frontend nam trong `docs/` de deploy bang GitHub Pages, backend Apps Script nam trong `backend/` nhu source backup.

## Cau truc

```text
docs/
  index.html
  tab-generator.html
  lucky-wheel.html
  css/
  js/
  assets/
backend/
  apps-script.gs
```

## Chay local

Cach nhanh nhat la mo truc tiep `docs/index.html` bang trinh duyet.

Neu muon mo phong gan giong GitHub Pages hon, dung extension Live Server trong VS Code va mo thu muc `docs/`.

## Anh nen Home

Hero trang Home dung anh noi bo tai:

```text
docs/assets/images/home-hero.jpg
```

Neu muon doi anh, dat file moi dung ten `home-hero.jpg` vao duong dan tren. CSS da co fallback gradient, nen trang van hien dung khi thieu anh.

Anh nen Login dung duong dan:

```text
docs/assets/images/login-background.jpg
```

Neu chua co file nay, login page se dung fallback gradient.

## Cau hinh API

Frontend doc Apps Script API tu:

```js
// docs/js/config.js
APP_CONFIG.API_URL
```

Khi doi URL `/exec`, sua gia tri `API_URL` trong `docs/js/config.js`.

URL hien tai:

```text
https://script.google.com/macros/s/AKfycbwDkCyxMJJ0xD_l-9xMSiW_11DT0aL-A36FkcUY_jaSWFzypp6sbpTJ8bpwHkp-mp-tCg/exec
```

API frontend mong doi du lieu dang:

```json
{
  "success": true,
  "updatedAt": "...",
  "services": [
    {
      "id": "morning",
      "label": "Buoi sang",
      "songs": ["136", "82"],
      "sermonSite": "",
      "sermonYoutube": "",
      "sermonText": "",
      "rawContent": ""
    }
  ]
}
```

Neu API loi, `success` la `false`, hoac du lieu khong hop le, trang `Trinh tao tab` se dung du lieu fallback trong `docs/js/config.js`.

## Deploy GitHub Pages

1. Vao repository tren GitHub.
2. Mo `Settings`.
3. Vao `Pages`.
4. Chon `Deploy from a branch`.
5. Chon branch `main`.
6. Chon folder `/docs`.
7. Luu cau hinh.

Toan bo duong dan frontend dang dung dang tuong doi nhu `./css/global.css` va `./js/config.js`, nen chay dung khi repository nam duoi subpath cua GitHub Pages.

## Deploy Apps Script

Apps Script chay rieng tren Google. File `backend/apps-script.gs` chi la source backup trong repo.

Khi sua backend:

1. Mo Google Apps Script project hien tai.
2. Cap nhat code theo `backend/apps-script.gs`.
3. Deploy phien ban moi.
4. Copy URL `/exec` moi neu Google tao URL moi.
5. Cap nhat `APP_CONFIG.API_URL` trong `docs/js/config.js` neu can.

## Cac page

- `docs/index.html`: Cong redirect. Chua dang nhap thi ve `login.html`; admin ve `admin/index.html`; user ve `home.html`.
- `docs/login.html`: Dang nhap bang Apps Script API, luu token trong `sessionStorage`.
- `docs/home.html`: Home sau dang nhap, doc `publicSettings`.
- `docs/tab-generator.html`: Tai `action=program`, xem truoc danh sach tab, chon tab va mo tab bang `window.open(url, "_blank", "noopener,noreferrer")`.
- `docs/lucky-wheel.html`: Tai `action=wheels`; neu API loi thi fallback ve danh sach cuc bo trong `localStorage`.
- `docs/admin/index.html`: Dashboard admin.
- `docs/admin/settings.html`: Goi admin settings API va cap nhat tung key.
- `docs/admin/wheels.html`: Tao, sua va xoa mem wheel qua admin API.

## Login va route guard

- Token chi luu trong `sessionStorage`, khong luu password.
- Cac page user goi `SionRouteGuard.requireAuth()`.
- Cac page admin goi `SionRouteGuard.requireAdmin()` va luon xac minh role qua backend `me`.
- Logout goi API `logout`, xoa session va ve login.
- Cac admin POST action dang duoc gui theo dang `admin.getSettings`, `admin.updateSetting`, `admin.createWheel`, `admin.updateWheel`, `admin.deleteWheel`.

## Test nhanh

1. Mo `docs/index.html` bang Live Server.
2. Xac nhan page redirect sang `docs/login.html` khi chua co session.
3. Dang nhap user thuong, kiem tra ve `home.html` va khong thay link admin.
4. Dang nhap admin, kiem tra ve `admin/index.html` va mo duoc `settings.html`, `wheels.html`.
5. Mo `tab-generator.html`, kiem tra API `action=program` tai du 3 buoi va khong mo `about:blank`.
6. Mo `lucky-wheel.html`, kiem tra `action=wheels` tai duoc dropdown wheel.
7. Dong tab/trinh duyet, session frontend se mat vi dung `sessionStorage`.
