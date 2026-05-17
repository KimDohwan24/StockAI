# stock-core-api 엔드포인트 정의서

> **Base URL:** `http://localhost:8080`  
> **클라이언트:** Next.js 프론트엔드 (`http://localhost:3000`)  
> **버전:** v1 (현재 Controller 단위 Path에 `/api` prefix 사용)

---

## 목차

1. [인증](#1-인증)
2. [KIS 인증 관리](#2-kis-인증-관리)
3. [국내 종목 카탈로그](#3-국내-종목-카탈로그)
4. [주식 시세](#4-주식-시세)
5. [계좌 조회](#5-계좌-조회)
6. [주문](#6-주문)
7. [해외 종목 카탈로그](#7-해외-종목-카탈로그)
8. [해외 시세](#8-해외-시세)
9. [해외 주문](#9-해외-주문)
10. [해외 계좌 조회](#10-해외-계좌-조회)
11. [요청/응답 DTO 정의](#11-요청응답-dto-정의)
12. [에러 코드](#12-에러-코드)

---

## 1. 인증

**Base Path:** `/api/auth`

| Method | Path | 설명 | Auth |
|--------|------|------|------|
| `POST` | `/api/auth/signup` | 회원가입 | ❌ Public |
| `POST` | `/api/auth/login` | 로그인 (JWT 발급) | ❌ Public |

### 1.1 POST /api/auth/signup
회원가입을 수행합니다.

**Request Body:** `SignupRequest`
```json
{
  "email": "user@example.com",
  "password": "password123",
  "name": "홍길동"
}
```

**Response:**
- `200 OK` — `"Signup successful"`
- `409 Conflict` — `AUTH_005` 이메일 중복

---

### 1.2 POST /api/auth/login
로그인 후 JWT Access Token을 발급받습니다.

**Request Body:** `LoginRequest`
```json
{
  "email": "user@example.com",
  "password": "password123"
}
```

**Response:** `TokenResponse`
```json
{
  "accessToken": "eyJhbGciOiJIUzI1NiIs...",
  "tokenType": "Bearer"
}
```
- 유효기간: **24시간**
- 이후 요청 헤더: `Authorization: Bearer <accessToken>`

---

## 2. KIS 인증 관리

**Base Path:** `/api/kis-auth`

> ⚠️ KIS(한국투자증권) Open API 연동에 필요한 Access Token 및 WebSocket Key를 관리합니다.  
> 주로 **서버 내부** 또는 **관리자**에서 호출하는 용도입니다.

| Method | Path | 설명 | Auth |
|--------|------|------|------|
| `POST` | `/api/kis-auth/token` | KIS Access Token 발급 | ✅ JWT |
| `POST` | `/api/kis-auth/websocket-key` | KIS WebSocket Key 발급 | ✅ JWT |
| `DELETE` | `/api/kis-auth/token` | KIS Access Token 폐기 | ✅ JWT |

### 2.1 POST /api/kis-auth/token
KIS API 호출에 필요한 Access Token을 새로 발급합니다.

**Response:**
- `200 OK` — `"token_value_string"`

---

### 2.2 POST /api/kis-auth/websocket-key
KIS 실시간 시세 WebSocket 연결용 Key를 발급합니다.

**Response:**
- `200 OK` — `"websocket_key_string"`

---

### 2.3 DELETE /api/kis-auth/token
발급된 KIS Access Token을 폐기합니다.

**Response:**
- `200 OK` — `"Token revoked"`

---

## 3. 국내 종목 카탈로그

**Base Path:** `/api/stocks`

| Method | Path | 설명 | Auth |
|--------|------|------|------|
| `GET` | `/api/stocks` | 전체 종목 목록 (페이지네이션) | ❌ Public |
| `GET` | `/api/stocks/search?query=` | 종목 검색 (이름/코드) | ❌ Public |
| `POST` | `/api/stocks/sync` | KIS 종목 마스터 동기화 (관리자) | ✅ JWT (ADMIN) |

### 3.1 GET /api/stocks
전체 국내 종목 목록을 페이지네이션으로 조회합니다.

**Query Parameters:**
| 이름 | 타입 | 필수 | 설명 | 예시 |
|------|------|------|------|------|
| `marketType` | string | ❌ | 시장구분 (KOSPI, KOSDAQ) | `KOSPI` |
| `sector` | string | ❌ | 섹터 필터 | `반도체` |
| `page` | int | ❌ | 페이지 번호 (0부터) | `0` |
| `size` | int | ❌ | 페이지 크기 (기본 20) | `20` |

**Response:** `Page<StockCatalogResponse>`
```json
{
  "content": [
    {
      "stockCode": "005930",
      "name": "삼성전자",
      "sector": "반도체",
      "marketType": "KOSPI"
    }
  ],
  "totalElements": 2500,
  "totalPages": 125,
  "number": 0,
  "size": 20
}
```

---

### 3.2 GET /api/stocks/search
종목명 또는 종목코드로 검색합니다.

**Query Parameters:**
| 이름 | 타입 | 필수 | 설명 |
|------|------|------|------|
| `query` | string | ✅ | 검색어 |
| `page` | int | ❌ | 페이지 번호 |
| `size` | int | ❌ | 페이지 크기 |

**Response:** `Page<StockCatalogResponse>` (동일)

---

### 3.3 POST /api/stocks/sync
KIS API에서 국내 전체 종목 마스터를 동기화합니다. (신규 INSERT, 기존 UPDATE)

**Required Role:** `ADMIN`

**Response:**
- `200 OK` — 신규 동기화된 종목 수 (integer)

---

## 4. 주식 시세

**Base Path:** `/api/stocks`

| Method | Path | 설명 | Auth |
|--------|------|------|------|
| `GET` | `/api/stocks/{stockCode}/price` | 현재가 조회 | ❌ Public |
| `POST` | `/api/stocks/daily` | 일별/주별/월별/년별 시세 조회 | ✅ JWT |
| `GET` | `/api/stocks/{stockCode}/minute` | 분봉 시세 조회 | ❌ Public |

### 4.1 GET /api/stocks/{stockCode}/price
특정 종목의 **현재가 및 기본 정보**를 조회합니다.

**Path Variable:**
| 이름 | 타입 | 설명 | 예시 |
|------|------|------|------|
| `stockCode` | string | 종목코드 (6자리) | `005930` |

**Response:** `StockPriceResponse`
```json
{
  "rprs_mrkt_kor_name": "KOSPI",
  "hts_kor_isnm": "삼성전자",
  "stck_prpr": "72500",
  "prdy_vrss": "500",
  "prdy_vrss_sign": "2",
  "prdy_ctrt": "0.69",
  "stck_oprc": "72000",
  "stck_hgpr": "73000",
  "stck_lwpr": "71800",
  "stck_mxpr": "94000",
  "stck_llmn": "51000",
  "stck_sdpr": "72000",
  "acml_vol": "12345678",
  "acml_tr_pbmn": "892345678900",
  "w52_hgpr": "85000",
  "w52_lwpr": "62000",
  "per": "15.23",
  "pbr": "1.45",
  "eps": "4762",
  "bps": "50000",
  "hts_avls": "4321056"
}
```

---

### 4.2 POST /api/stocks/daily
특정 종목의 **기간별(일/주/월/년) 시세**를 조회합니다.

**Request Body:** `DailyPriceRequest`
```json
{
  "stockCode": "005930",
  "period": "D",
  "startDate": "20240101",
  "endDate": "20241231"
}
```

| 필드 | 타입 | 필수 | 설명 |
|------|------|------|------|
| `stockCode` | string | ✅ | 종목코드 (6자리) |
| `period` | string | ✅ | 기간구분: `D`(일), `W`(주), `M`(월), `Y`(년) |
| `startDate` | string | ✅ | 조회 시작일: `YYYYMMDD` |
| `endDate` | string | ✅ | 조회 종료일: `YYYYMMDD` |

**Response:** `List<DailyPriceItem>`
```json
[
  {
    "stck_bsop_date": "20240102",
    "stck_clpr": "72000",
    "stck_oprc": "71500",
    "stck_hgpr": "72500",
    "stck_lwpr": "71000",
    "acml_vol": "12345678",
    "acml_tr_pbmn": "892345678900",
    "prdy_vrss": "300",
    "prdy_vrss_sign": "2",
    "prdy_ctrt": "0.42",
    "flng_cls_code": "00",
    "prtt_rate": "1.00",
    "mod_yn": "N",
    "prdy_vol": "11000000"
  }
]
```

---

### 4.3 GET /api/stocks/{stockCode}/minute
특정 종목의 **분봉(1분 단위) 시세**를 조회합니다.

**Path Variable:**
| 이름 | 타입 | 설명 | 예시 |
|------|------|------|------|
| `stockCode` | string | 종목코드 (6자리) | `005930` |

**Response:** `List<MinutePriceItem>`
```json
[
  {
    "stck_bsop_date": "20240102",
    "stck_cntg_hour": "090100",
    "stck_prpr": "72000",
    "stck_oprc": "71500",
    "stck_hgpr": "72100",
    "stck_lwpr": "71400",
    "cntg_vol": "12345",
    "acml_vol": "12345",
    "acml_tr_pbmn": "892345600"
  }
]
```

---

## 5. 계좌 조회

**Base Path:** `/api/account`

> KIS(한국투자증권) 연동 계좌의 보유 종목 및 잔고 정보를 조회합니다.

| Method | Path | 설명 | Auth |
|--------|------|------|------|
| `GET` | `/api/account/balance` | 보유 종목 잔고 조회 | ✅ JWT |
| `GET` | `/api/account/balance/summary` | 계좌 잔고 요약 조회 | ✅ JWT |
| `GET` | `/api/account/realized-profit` | 실현손익 내역 조회 | ✅ JWT |
| `POST` | `/api/account/buying-power` | 매수가능금액 조회 | ✅ JWT |

### 5.1 GET /api/account/balance
보유 중인 **모든 종목의 상세 잔고**를 조회합니다.

**Response:** `List<BalanceItem>`
```json
[
  {
    "pdno": "005930",
    "prdt_name": "삼성전자",
    "hldg_qty": "100",
    "ord_psbl_qty": "100",
    "pchs_avg_pric": "70000",
    "evlu_amt": "7250000",
    "evlu_pfls_amt": "250000",
    "evlu_pfls_rt": "3.57",
    "prpr": "72500",
    "pchs_amt": "7000000",
    "loan_amt": "0",
    "loan_dt": "",
    "expd_dt": ""
  }
]
```

---

### 5.2 GET /api/account/balance/summary
계좌 전체의 **잔고 요약 정보**를 조회합니다.

**Response:** `BalanceSummary`
```json
{
  "dnca_tot_amt": "10000000",
  "nxdy_excc_amt": "0",
  "prvs_rcdl_excc_amt": "0",
  "scts_evlu_amt": "7250000",
  "tot_evlu_amt": "17250000",
  "evlu_amt_smtl_amt": "7250000",
  "pchs_amt_smtl_amt": "7000000",
  "evlu_pfls_smtl_amt": "250000",
  "tot_stln_slng_amt": "0",
  "scts_sftg_amt": "0",
  "bfdy_buy_amt": "0",
  "thdt_buy_amt": "0",
  "bfdy_sll_amt": "0",
  "thdt_sll_amt": "0",
  "dpsca_tot_amt": "17250000",
  "tot_loan_amt": "0"
}
```

---

### 5.3 GET /api/account/realized-profit
**실현손익(체결 완료된 매매) 내역**을 조회합니다.

**Response:** `List<RealizedProfitItem>`
```json
[
  {
    "ord_dt": "20240115",
    "ord_gno_brno": "12345",
    "odno": "0000012345",
    "orgn_odno": "",
    "sll_buy_dvsn_cd_name": "매도",
    "pdno": "005930",
    "prdt_name": "삼성전자",
    "ord_qty": "50",
    "ord_unpr": "73000",
    "avg_prvs": "70000",
    "tot_ccld_amt": "3650000",
    "ccld_qty": "50",
    "rmn_qty": "0"
  }
]
```

---

### 5.4 POST /api/account/buying-power
특정 종목에 대한 **매수 가능 금액/수량**을 조회합니다.

**Request Body:** `BuyingPowerRequest`
```json
{
  "stockCode": "005930"
}
```

**Response:** `BuyingPowerResponse`
```json
{
  "nrcvb_buy_amt": "10000000",
  "nrcvb_buy_qty": "137",
  "max_buy_amt": "10000000",
  "max_buy_qty": "137",
  "ord_psbl_cash": "10000000",
  "ord_psbl_sbst": "0",
  "rcbf_dnca": "0",
  "dpsast_tot_amt": "17250000"
}
```

---

## 6. 주문

**Base Path:** `/api/orders`

> KIS(한국투자증권) 연동 계좌로 **매수/매도 주문**을 전송합니다.

| Method | Path | 설명 | Auth |
|--------|------|------|------|
| `POST` | `/api/orders/buy` | 매수 주문 | ✅ JWT |
| `POST` | `/api/orders/sell` | 매도 주문 | ✅ JWT |

### 6.1 POST /api/orders/buy
**매수 주문**을 전송합니다.

**Request Body:** `OrderRequestDto`
```json
{
  "stockCode": "005930",
  "quantity": 10,
  "price": 0
}
```

| 필드 | 타입 | 필수 | 설명 |
|------|------|------|------|
| `stockCode` | string | ✅ | 종목코드 (6자리) |
| `quantity` | int | ✅ | 주문수량 |
| `price` | int | ✅ | 주문단가. `0`이면 **시장가** |

> 내부적으로 `price=0`이면 시장가(`01`), 아니면 지정가(`00`)로 변환됩니다.

**Response:** `OrderResponse`
```json
{
  "KRX_FWDG_ORD_ORGNO": "KRX12345",
  "ODNO": "0000012345",
  "ORD_TMD": "090130"
}
```

---

### 6.2 POST /api/orders/sell
**매도 주문**을 전송합니다.

**Request Body:** `OrderRequestDto`
```json
{
  "stockCode": "005930",
  "quantity": 10,
  "price": 73000
}
```

**Response:** `OrderResponse` (동일)

---

## 7. 해외 종목 카탈로그

**Base Path:** `/api/overseas-stocks`

| Method | Path | 설명 | Auth |
|--------|------|------|------|
| `GET` | `/api/overseas-stocks` | 전체 해외 종목 목록 (페이지네이션) | ❌ Public |
| `GET` | `/api/overseas-stocks/search?query=` | 해외 종목 검색 (이름/티커) | ❌ Public |
| `GET` | `/api/overseas-stocks/{ticker}/price?exchange=` | 해외 종목 실시간 시세 | ❌ Public |
| `POST` | `/api/overseas-stocks/sync` | KIS 해외 종목 마스터 동기화 (관리자) | ✅ JWT (ADMIN) |

### 7.1 GET /api/overseas-stocks
전체 해외 종목 목록을 페이지네이션으로 조회합니다.

**Query Parameters:**
| 이름 | 타입 | 필수 | 설명 | 예시 |
|------|------|------|------|------|
| `exchangeCode` | string | ❌ | 거래소코드 (NAS, NYS, AMS, HKQ, TKY, SHH, SHZ, HXK) | `NAS` |
| `country` | string | ❌ | 국가 (US, JP, HK, CN) | `US` |
| `page` | int | ❌ | 페이지 번호 (0부터) | `0` |
| `size` | int | ❌ | 페이지 크기 (기본 20) | `20` |

**Response:** `Page<OverseasStockCatalogResponse>`
```json
{
  "content": [
    {
      "ticker": "AAPL",
      "name": "Apple Inc.",
      "exchangeCode": "NAS",
      "country": "US",
      "sector": "Technology",
      "currency": "USD"
    }
  ],
  "totalElements": 5000,
  "totalPages": 250,
  "number": 0,
  "size": 20
}
```

---

### 7.2 GET /api/overseas-stocks/search
해외 종목명 또는 티커로 검색합니다.

**Query Parameters:**
| 이름 | 타입 | 필수 | 설명 |
|------|------|------|------|
| `query` | string | ✅ | 검색어 |
| `page` | int | ❌ | 페이지 번호 |
| `size` | int | ❌ | 페이지 크기 |

**Response:** `Page<OverseasStockCatalogResponse>` (동일)

---

### 7.3 GET /api/overseas-stocks/{ticker}/price
해외 종목의 실시간 시세를 KIS API에서 조회합니다. (캐싱 없음, 항상 실시간)

**Path Variable:**
| 이름 | 타입 | 설명 | 예시 |
|------|------|------|------|
| `ticker` | string | 해외 종목코드 | `AAPL` |

**Query Parameters:**
| 이름 | 타입 | 필수 | 설명 | 예시 |
|------|------|------|------|------|
| `exchange` | string | ✅ | 거래소코드 | `NAS` |

**Response:** `OverseasStockPriceResponse`
```json
{
  "ovrs_nmix_prpr": "185.50",
  "ovrs_nmix_prdy_vrss": "2.30",
  "prdy_vrss_sign": "2",
  "prdy_ctrt": "1.26",
  "ovrs_icod": "NAS",
  "symb": "AAPL",
  "item_name": "Apple Inc.",
  "ovrs_hgpr": "186.80",
  "ovrs_lwpr": "183.20",
  "ovrs_oprc": "183.90",
  "acml_vol": "52345678",
  "psvs_clos": "183.20",
  "tr_52w_hgpr": "199.62",
  "tr_52w_lwpr": "143.90"
}
```

---

### 7.4 POST /api/overseas-stocks/sync
KIS API에서 해외 전체 종목 마스터를 동기화합니다.

**Required Role:** `ADMIN`

**Response:**
- `200 OK` — 신규 동기화된 종목 수 (integer)

---

## 8. 해외 시세

> 해외 시세는 실시간 KIS API를 직접 호출하며, 캐싱하지 않습니다.

**Base Path:** `/api/overseas-stocks`

| Method | Path | 설명 | Auth |
|--------|------|------|------|
| `GET` | `/api/overseas-stocks/{ticker}/price?exchange=` | 해외 종목 현재가 | ❌ Public |

---

## 9. 해외 주문

**Base Path:** `/api/overseas-orders`

| Method | Path | 설명 | Auth |
|--------|------|------|------|
| `POST` | `/api/overseas-orders/buy` | 해외 매수 주문 | ✅ JWT |
| `POST` | `/api/overseas-orders/sell` | 해외 매도 주문 | ✅ JWT |

### 9.1 POST /api/overseas-orders/buy
해외 주식 매수 주문을 전송합니다.

**Request Body:** `OverseasOrderRequestDto`
```json
{
  "ticker": "AAPL",
  "exchangeCode": "NAS",
  "quantity": 10,
  "price": 0
}
```

| 필드 | 타입 | 필수 | 설명 |
|------|------|------|------|
| `ticker` | string | ✅ | 해외 종목코드 |
| `exchangeCode` | string | ✅ | 거래소코드 (NAS, NYS, AMS, HKQ, TKY, SHH, SHZ, HXK) |
| `quantity` | int | ✅ | 주문수량 (1 이상) |
| `price` | int | ✅ | 주문단가. `0`이면 **시장가** |

**Response:** `OverseasOrderResponse`
```json
{
  "KRX_FWDG_ORD_ORGNO": "KRX12345",
  "ODNO": "0000012345",
  "ORD_TMD": "220030"
}
```

---

### 9.2 POST /api/overseas-orders/sell
해외 주식 매도 주문을 전송합니다.

**Request Body:** `OverseasOrderRequestDto` (동일)

**Response:** `OverseasOrderResponse` (동일)

---

## 10. 해외 계좌 조회

**Base Path:** `/api/overseas-account`

| Method | Path | 설명 | Auth |
|--------|------|------|------|
| `GET` | `/api/overseas-account/balance` | 해외 잔고 조회 | ✅ JWT |
| `GET` | `/api/overseas-account/balance/summary` | 해외 잔고 요약 | ✅ JWT |
| `POST` | `/api/overseas-account/buying-power` | 해외 매수가능금액 조회 | ✅ JWT |

### 10.1 GET /api/overseas-account/balance
해외 보유 종목의 상세 잔고를 조회합니다.

**Response:** `OverseasBalanceResponse`
```json
{
  "output1": [
    {
      "ovrs_pdno": "AAPL",
      "ovrs_item_name": "Apple Inc.",
      "ovrs_cblc_qty": "10",
      "pchs_avg_pric": "175.50",
      "ovrs_stck_prpr": "185.50",
      "frcr_evlu_pfls_amt": "100.00",
      "evlu_pfls_rt": "5.70",
      "ovrs_excg_cd": "NAS",
      "tr_natn_cd": "US"
    }
  ],
  "output2": {
    "tot_evlu_amt": "1855.00",
    "frcr_evlu_pfls_amt": "100.00",
    "tot_frcr_evlu_pfls_amt": "100.00",
    "ovrs_tot_pchs_amt": "1755.00",
    "ovrs_rlzt_pfls": "0"
  }
}
```

---

### 10.2 GET /api/overseas-account/balance/summary
해외 계좌 전체의 잔고 요약 정보를 조회합니다.

**Response:** `OverseasBalanceResponse` (동일, output2 활용)

---

### 10.3 POST /api/overseas-account/buying-power
해외 주문 가능 금액을 조회합니다.

**Query Parameters:**
| 이름 | 타입 | 필수 | 설명 | 예시 |
|------|------|------|------|------|
| `exchangeCode` | string | ✅ | 거래소코드 | `NAS` |

**Response:** `OverseasBuyingPowerResponse`
```json
{
  "max_buy_amt": "50000.00",
  "max_buy_qty": "269",
  "ord_psbl_cash": "50000.00",
  "frcr_ord_psbl_amt": "50000.00",
  "ovrs_ord_psbl_amt": "50000.00"
}
```

---

### 11.1 요청 DTO (Request)

#### SignupRequest
```json
{
  "email": "string",    // 이메일
  "password": "string", // 비밀번호
  "name": "string"      // 사용자 이름
}
```

#### LoginRequest
```json
{
  "email": "string",    // 이메일
  "password": "string"  // 비밀번호
}
```

#### DailyPriceRequest
```json
{
  "stockCode": "string",  // 종목코드 (6자리)
  "period": "string",     // D:일, W:주, M:월, Y:년
  "startDate": "string",  // YYYYMMDD
  "endDate": "string"     // YYYYMMDD
}
```

#### BuyingPowerRequest
```json
{
  "stockCode": "string"   // 종목코드 (6자리)
}
```

#### OrderRequestDto
```json
{
  "stockCode": "string",  // 종목코드 (6자리)
  "quantity": 0,          // 주문수량
  "price": 0                // 주문단가 (0: 시장가)
}
```

#### OverseasOrderRequestDto
```json
{
  "ticker": "string",       // 해외 종목코드 (예: AAPL)
  "exchangeCode": "string", // 거래소코드 (NAS, NYS, AMS, HKQ, TKY, SHH, SHZ, HXK)
  "quantity": 0,            // 주문수량 (1 이상)
  "price": 0                // 주문단가 (0: 시장가)
}
```

---

### 11.2 응답 DTO (Response)

#### TokenResponse
```json
{
  "accessToken": "string",  // JWT Access Token
  "tokenType": "Bearer"     // 토큰 타입 (고정)
}
```

#### StockPriceResponse
```json
{
  "rprs_mrkt_kor_name": "string",   // 대표시장한글명 (KOSPI/KOSDAQ)
  "hts_kor_isnm": "string",          // HTS한글종목명
  "stck_prpr": "string",              // 주식현재가
  "prdy_vrss": "string",              // 전일대비
  "prdy_vrss_sign": "string",         // 전일대비부호 (1:상한,2:상승,3:보합,4:하락,5:하한)
  "prdy_ctrt": "string",              // 전일대비율
  "stck_oprc": "string",              // 주식시가
  "stck_hgpr": "string",              // 주식최고가
  "stck_lwpr": "string",              // 주식최저가
  "stck_mxpr": "string",              // 상한가
  "stck_llmn": "string",              // 하한가
  "stck_sdpr": "string",              // 주식기준가 (전일종가)
  "acml_vol": "string",               // 누적거래량
  "acml_tr_pbmn": "string",           // 누적거래대금
  "w52_hgpr": "string",               // 52주 최고가
  "w52_lwpr": "string",               // 52주 최저가
  "per": "string",                    // PER
  "pbr": "string",                    // PBR
  "eps": "string",                    // EPS
  "bps": "string",                    // BPS
  "hts_avls": "string"                // HTS시가총액 (억원)
}
```

#### DailyPriceItem
```json
{
  "stck_bsop_date": "string",   // 영업일 (YYYYMMDD)
  "stck_clpr": "string",        // 주식종가
  "stck_oprc": "string",        // 주식시가
  "stck_hgpr": "string",        // 주식최고가
  "stck_lwpr": "string",        // 주식최저가
  "acml_vol": "string",         // 누적거래량
  "acml_tr_pbmn": "string",     // 누적거래대금
  "prdy_vrss": "string",        // 전일대비
  "prdy_vrss_sign": "string",   // 전일대비부호
  "prdy_ctrt": "string",        // 전일대비율
  "flng_cls_code": "string",    // 락구분코드
  "prtt_rate": "string",        // 분할비율
  "mod_yn": "string",           // 변경여부
  "prdy_vol": "string"          // 전일거래량
}
```

#### MinutePriceItem
```json
{
  "stck_bsop_date": "string",   // 영업일 (YYYYMMDD)
  "stck_cntg_hour": "string",   // 주식체결시간 (HHMMSS)
  "stck_prpr": "string",        // 주식현재가
  "stck_oprc": "string",        // 주식시가
  "stck_hgpr": "string",        // 주식최고가
  "stck_lwpr": "string",        // 주식최저가
  "cntg_vol": "string",         // 체결거래량
  "acml_vol": "string",         // 누적거래량
  "acml_tr_pbmn": "string"      // 누적거래대금
}
```

#### BalanceItem
```json
{
  "pdno": "string",             // 종목코드
  "prdt_name": "string",        // 종목명
  "hldg_qty": "string",         // 보유수량
  "ord_psbl_qty": "string",     // 주문가능수량
  "pchs_avg_pric": "string",    // 매입평균가격
  "evlu_amt": "string",         // 평가금액
  "evlu_pfls_amt": "string",    // 평가손익금액
  "evlu_pfls_rt": "string",     // 평가손익율
  "prpr": "string",             // 현재가
  "pchs_amt": "string",         // 매입금액
  "loan_amt": "string",         // 대출금액
  "loan_dt": "string",          // 대출일자
  "expd_dt": "string"           // 만기일자
}
```

#### BalanceSummary
```json
{
  "dnca_tot_amt": "string",        // 예수금총금액
  "nxdy_excc_amt": "string",       // 익일정산금액
  "prvs_rcdl_excc_amt": "string",  // 가수정산금액
  "scts_evlu_amt": "string",       // 유가평가금액
  "tot_evlu_amt": "string",        // 총평가금액
  "evlu_amt_smtl_amt": "string",   // 평가금액합계금액
  "pchs_amt_smtl_amt": "string",   // 매입금액합계금액
  "evlu_pfls_smtl_amt": "string",  // 평가손익합계금액
  "tot_stln_slng_amt": "string",   // 총대주금액
  "scts_sftg_amt": "string",       // 유가대금
  "bfdy_buy_amt": "string",        // 전일매수금액
  "thdt_buy_amt": "string",        // 금일매수금액
  "bfdy_sll_amt": "string",        // 전일매도금액
  "thdt_sll_amt": "string",        // 금일매도금액
  "dpsca_tot_amt": "string",       // 예탁자산총금액
  "tot_loan_amt": "string"         // 총대출금액
}
```

#### RealizedProfitItem
```json
{
  "ord_dt": "string",              // 주문일자
  "ord_gno_brno": "string",        // 주문채번지점번호
  "odno": "string",                // 주문번호
  "orgn_odno": "string",           // 원주문번호
  "sll_buy_dvsn_cd_name": "string", // 매도매수구분코드명
  "pdno": "string",                // 종목코드
  "prdt_name": "string",           // 종목명
  "ord_qty": "string",             // 주문수량
  "ord_unpr": "string",            // 주문단가
  "avg_prvs": "string",            // 평균단가
  "tot_ccld_amt": "string",        // 총체결금액
  "ccld_qty": "string",            // 체결수량
  "rmn_qty": "string"              // 잔여수량
}
```

#### BuyingPowerResponse
```json
{
  "nrcvb_buy_amt": "string",   // 미수없는매수가능금액
  "nrcvb_buy_qty": "string",   // 미수없는매수가능수량
  "max_buy_amt": "string",     // 최대매수가능금액
  "max_buy_qty": "string",     // 최대매수가능수량
  "ord_psbl_cash": "string",   // 주문가능현금
  "ord_psbl_sbst": "string",   // 주문가능대용
  "rcbf_dnca": "string",       // 재사용가능예수금
  "dpsast_tot_amt": "string"   // 예탁자산총금액
}
```

#### OrderResponse
```json
{
  "KRX_FWDG_ORD_ORGNO": "string", // 주문시한국거래소부구분조직번호
  "ODNO": "string",               // 주문번호
  "ORD_TMD": "string"             // 주문시각 (HHMMSS)
}
```

#### StockCatalogResponse
```json
{
  "stockCode": "string",    // 종목코드 (예: 005930)
  "name": "string",         // 종목명 (예: 삼성전자)
  "sector": "string",       // 섹터 (예: 반도체)
  "marketType": "string"    // 시장구분 (KOSPI / KOSDAQ)
}
```

#### OverseasStockCatalogResponse
```json
{
  "ticker": "string",        // 해외 종목코드 (예: AAPL)
  "name": "string",          // 종목명 (예: Apple Inc.)
  "exchangeCode": "string",  // 거래소코드 (NAS, NYS, AMS, HKQ, TKY, SHH, SHZ, HXK)
  "country": "string",       // 국가 (US, JP, HK, CN)
  "sector": "string",        // 섹터
  "currency": "string"       // 통화 (USD, JPY, HKD, CNY)
}
```

#### OverseasStockPriceResponse
```json
{
  "ovrs_nmix_prpr": "string",       // 해외현재가
  "ovrs_nmix_prdy_vrss": "string",  // 해외전일대비
  "prdy_vrss_sign": "string",       // 전일대비부호
  "prdy_ctrt": "string",            // 전일대비율
  "ovrs_icod": "string",            // 해외거래소코드
  "symb": "string",                 // 종목코드
  "item_name": "string",            // 종목명
  "ovrs_hgpr": "string",            // 해외최고가
  "ovrs_lwpr": "string",            // 해외최저가
  "ovrs_oprc": "string",            // 해외시가
  "acml_vol": "string",             // 누적거래량
  "psvs_clos": "string",            // 전일종가
  "tr_52w_hgpr": "string",          // 52주최고가
  "tr_52w_lwpr": "string"           // 52주최저가
}
```

#### OverseasOrderResponse
```json
{
  "KRX_FWDG_ORD_ORGNO": "string", // 주문시한국거래소부구분조직번호
  "ODNO": "string",               // 주문번호
  "ORD_TMD": "string"             // 주문시각 (HHMMSS)
}
```

#### OverseasBalanceItem
```json
{
  "ovrs_pdno": "string",           // 해외종목번호
  "ovrs_item_name": "string",      // 해외종목명
  "ovrs_cblc_qty": "string",       // 해외잔고수량
  "pchs_avg_pric": "string",       // 매입평균가격
  "ovrs_stck_prpr": "string",      // 해외주식현재가
  "frcr_evlu_pfls_amt": "string",  // 외화평가손익금액
  "evlu_pfls_rt": "string",        // 평가손익율
  "ovrs_excg_cd": "string",        // 해외거래소코드
  "tr_natn_cd": "string"           // 거래국가코드
}
```

#### OverseasBalanceSummary
```json
{
  "tot_evlu_amt": "string",          // 총평가금액
  "frcr_evlu_pfls_amt": "string",    // 외화평가손익금액
  "tot_frcr_evlu_pfls_amt": "string",// 총외화평가손익금액
  "ovrs_tot_pchs_amt": "string",     // 해외총매입금액
  "ovrs_rlzt_pfls": "string"         // 해외실현손익
}
```

#### OverseasBuyingPowerResponse
```json
{
  "max_buy_amt": "string",          // 최대매수가능금액
  "max_buy_qty": "string",          // 최대매수가능수량
  "ord_psbl_cash": "string",        // 주문가능현금
  "frcr_ord_psbl_amt": "string",    // 외화주문가능금액
  "ovrs_ord_psbl_amt": "string"     // 해외주문가능금액
}
```

---

## 12. 에러 코드

> 형식: `{도메인}_{번호}`

| 코드 | 메시지 | HTTP 상태 |
|------|--------|-----------|
| `AUTH_001` | 인증 실패 | 401 |
| `AUTH_002` | 토큰 만료 | 401 |
| `AUTH_005` | 이메일 중복 | 409 |
| `USER_001` | 사용자 없음 | 404 |
| `STOCK_001` | 종목 없음 | 404 |
| `OVERSEAS_001` | 해외 종목 없음 | 404 |
| `OVERSEAS_002` | 해외 주문 실패 | 400 |
| `SYSTEM_002` | 내부 서버 오류 | 500 |

---

## 참고 사항

- **JWT 인증:** 모든 보호된 엔드포인트는 `Authorization: Bearer <accessToken>` 헤더가 필요합니다.
- **KIS API 연동:** `/api/account/*`, `/api/orders/*`, `/api/stocks/*`, `/api/overseas-stocks/*`, `/api/overseas-orders/*`, `/api/overseas-account/*` 엔드포인트는 KIS(한국투자증권) Open API를 호출합니다.
- **시장가 주문:** `OrderRequestDto.price = 0` 또는 `OverseasOrderRequestDto.price = 0` 으로 설정하면 시장가 주문이 됩니다.
- **String 타입 주의:** KIS API 응답의 대부분 수치 데이터는 `string` 타입으로 전달됩니다. 프론트엔드에서 필요시 `Number()` 변환을 해주세요.
- **해외 거래소코드 매핑:** NAS=NASDAQ, NYS=NYSE, AMS=AMEX, HKQ=홍콩, TKY=도쿄, SHH=상해, SHZ=심천, HXK=홍콩ETF
- **관리자 권한:** `POST /api/stocks/sync`, `POST /api/overseas-stocks/sync` 엔드포인트는 ADMIN 역할이 필요합니다.

---

> **생성일:** 2026-05-16  
> **대상 서버:** `stock-core-api` (Spring Boot)  
> **Base URL:** `http://localhost:8080`
