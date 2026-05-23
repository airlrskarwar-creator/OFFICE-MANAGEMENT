from flask import Flask, request, jsonify, Response
from flask_cors import CORS
from oauth2client.service_account import ServiceAccountCredentials
import gspread
import os
import json
import threading
import time
import requests

app = Flask(__name__)
CORS(app)

# =========================================================
# 💾 GOOGLE AUTH & INITIALIZATION
# =========================================================
scope = [
    "https://spreadsheets.google.com/feeds",
    "https://www.googleapis.com/auth/drive"
]

creds_dict = json.loads(os.environ["GOOGLE_CREDENTIALS"])
creds = ServiceAccountCredentials.from_json_keyfile_dict(creds_dict, scope)
client = gspread.authorize(creds)

# Open Files
sbgexp_file = client.open_by_key("1d_KdfKp4ZnnmJ_5W_F03RKdlhnScJKQgsUEklss2edY")
dg_file     = client.open_by_key("1-9VoQ961MHS7rJf1P5o3ItKH4jsxo4GxNN-oz4ezrn0")
diesel_file = client.open_by_key("1a-zsw9-AdssijOlyyxxaD-XEDmuSBr9lJHYK9awuKEo")
duty_file   = client.open_by_key("1rphBbU2_2xFeX-Htj1PpYvsZID5kKUcJ6Ho8Kg8Auao")
eb_file     = client.open_by_key("1r9x-S1m9fAuVwB16cVH3E9-jHEIMOCtQrHH24OjopA0")
emp_file    = client.open_by_key("1YAOtydebgF1-XTqJ5ypYDQRK06t5XU7Q5redoGmuow0")
pb_file     = client.open_by_key("1EAQcIzUBoG5U-dkOAOaHozwtxFURbW0a4l248-RNL18")
ref_file    = client.open_by_key("1T8mzTxvyQfVJp5eOAr8w7SZxkY7XbWNw-E4muvgZB1A")
sbg_file    = client.open_by_key("1VeQApi6T1Rd08uL-oOmulgpfo08NJqs5yL5ec-3REkE")
txn_file    = client.open_by_key("1Li_5Zv5hEPNNXqAgizQZe20OrRDwZrgrvLXOoXVsLO4")
esr_file    = client.open_by_key("1-ieObqiKds8GoPFI6aMIPnDljGhFcvQmI9AKGMv_vjI")

# Worksheets
emp_sheet    = emp_file.worksheet("EmpDB")
pb_sheet     = pb_file.worksheet("PBDB")
duty_sheet   = duty_file.worksheet("DutyChart")
sbg_sheet    = sbg_file.worksheet("BudgetDB")
sbgexp_sheet = sbgexp_file.worksheet("SBGexpenditure")
dg_sheet     = dg_file.worksheet("DGlog")
hsd_sheet    = diesel_file.worksheet("HSDlog")
eb_sheet     = eb_file.worksheet("EBlog")
esr_sheet    = esr_file.worksheet("ESR")
txn_sheet    = txn_file.worksheet("Transmission")

cpc_sheet  = ref_file.worksheet("CPC7DB")
city_sheet = ref_file.worksheet("CityZoneDB")
qtrs_sheet = ref_file.worksheet("QtrsRateDB")
comm_sheet = ref_file.worksheet("CommFactDB")
it_sheet   = ref_file.worksheet("ITDB")

# =========================================================
# ⚡ GLOBAL MEMORY CACHE (Standardized Max Column Width)
# =========================================================
def fetch_cache(sheet, range_name="A:ZZ"):
    try:
        return sheet.get(range_name)
    except Exception:
        return sheet.get_all_values()

print("⚡ Warming up sheet caches...")
EMP_CACHE    = fetch_cache(emp_sheet)
SBG_CACHE    = fetch_cache(sbg_sheet)
SBGEXP_CACHE = fetch_cache(sbgexp_sheet)
PB_CACHE     = fetch_cache(pb_sheet)
CPC_CACHE    = fetch_cache(cpc_sheet)
CITY_CACHE   = fetch_cache(city_sheet)
QTRS_CACHE   = fetch_cache(qtrs_sheet)
COMM_CACHE   = fetch_cache(comm_sheet)
IT_CACHE     = fetch_cache(it_sheet)
DG_CACHE     = fetch_cache(dg_sheet)
HSD_CACHE    = fetch_cache(hsd_sheet)
EB_CACHE     = fetch_cache(eb_sheet)
DUTY_CACHE   = fetch_cache(duty_sheet)
ESR_CACHE    = fetch_cache(esr_sheet)
TXN_CACHE    = fetch_cache(txn_sheet)
print("✅ Caches loaded successfully.")

ROLE_USERS = [
    {"user": "MASTER", "password": "master@11051993"},
    {"user": "ENGG", "password": "engg@225344"},
    {"user": "ADMIN", "password": "admin@221902"}
]

def cache_to_json(cache_data):
    if not cache_data:
        return {"headers": [], "rows": []}
    return {"headers": cache_data[0], "rows": cache_data[1:]}

# =========================================================
# 🚀 FAST READ APIs (Instant response from memory)
# =========================================================
@app.route("/emp", methods=["GET"])
def get_emp(): return jsonify(cache_to_json(EMP_CACHE))

@app.route("/sbg", methods=["GET"])
def get_sbg(): return jsonify(cache_to_json(SBG_CACHE))

@app.route("/pb", methods=["GET"])
def get_pb(): return jsonify(cache_to_json(PB_CACHE))

@app.route("/cpc", methods=["GET"])
def get_cpc(): return jsonify(cache_to_json(CPC_CACHE))

@app.route("/city", methods=["GET"])
def get_city(): return jsonify(cache_to_json(CITY_CACHE))

@app.route("/qtrs", methods=["GET"])
def get_qtrs(): return jsonify(cache_to_json(QTRS_CACHE))

@app.route("/comm", methods=["GET"])
def get_comm(): return jsonify(cache_to_json(COMM_CACHE))

@app.route("/it", methods=["GET"])
def get_it(): return jsonify(cache_to_json(IT_CACHE))

@app.route("/dg", methods=["GET"])
def get_dg(): return jsonify(cache_to_json(DG_CACHE))

@app.route("/hsd", methods=["GET"])
def get_hsd(): return jsonify(cache_to_json(HSD_CACHE))

@app.route("/eb", methods=["GET"])
def get_eb(): return jsonify(cache_to_json(EB_CACHE))

@app.route("/duty", methods=["GET"])
def get_duty(): return jsonify(cache_to_json(DUTY_CACHE))

@app.route("/esr", methods=["GET"])
def get_esr(): return jsonify(cache_to_json(ESR_CACHE))

@app.route("/txn", methods=["GET"])
def get_txn(): return jsonify(cache_to_json(TXN_CACHE))


@app.route("/sbgexp", methods=["GET"])
def get_sbgexp():
    global SBGEXP_CACHE
    return jsonify(cache_to_json(SBGEXP_CACHE))

# =========================================================
# 🔐 LOGIN API
# =========================================================
@app.route("/login", methods=["POST"])
def login():
    try:
        data = request.get_json()
        station = (data.get("station") or "").strip()
        user = (data.get("user") or "").strip().upper()
        password = (data.get("password") or "").strip()

        role_user = next((r for r in ROLE_USERS if r["user"].upper() == user and r["password"] == password), None)
        if role_user:
            return jsonify({"success": True, "user": role_user["user"], "displayName": role_user["user"], "station": station, "role": role_user["user"]})

        headers = EMP_CACHE[0]
        emp_data = [dict(zip(headers, row)) for row in EMP_CACHE[1:]]
        found_user = next((emp for emp in emp_data if str(emp.get("User", "")).strip().upper() == user), None)

        if not found_user or str(found_user.get("Password", "")).strip() != password:
            return jsonify({"success": False, "message": "Invalid user credentials"})

        return jsonify({
            "success": True,
            "user": found_user.get("User", ""),
            "displayName": found_user.get("Employee Name", user),
            "initial": found_user.get("Initial", ""),
            "station": station,
            "role": "USER"
        })
    except Exception as e:
        return jsonify({"success": False, "message": str(e)}), 500

# =========================================================
# 🔥 OPM UPDATE ROUTINES (Direct Batching & Cache Refresh)
# =========================================================

@app.route("/pb/update", methods=["POST"])
def update_pb():
    try:
        global PB_CACHE
        req_data = request.get_json()
        edit_rows = req_data.get("data", [])
        if not edit_rows:
            return jsonify({"status": "error", "message": "No data received"}), 400

        headers = PB_CACHE[0]
        body = PB_CACHE[1:]
        month_idx = headers.index("Salary Month")
        hris_idx = headers.index("HRIS") if "HRIS" in headers else -1

        row_map = {}
        for i, r in enumerate(body, start=2):
            key = str(r[month_idx]).strip().lower()
            if hris_idx >= 0 and hris_idx < len(r):
                key += f"|{str(r[hris_idx]).strip().lower()}"
            row_map[key] = i

        updates = []
        new_rows = []

        for obj in edit_rows:
            key = str(obj.get("Salary Month", "")).strip().lower()
            if hris_idx >= 0:
                key += f"|{str(obj.get('HRIS', '')).strip().lower()}"

            row_data = [obj.get(h, "") for h in headers]

            if key in row_map:
                row_num = row_map[key]
                updates.append({
                    "range": f"A{row_num}",
                    "values": [row_data]
                })
            else:
                new_rows.append(row_data)

        if updates:
            pb_sheet.batch_update(updates, value_input_option="USER_ENTERED")
        if new_rows:
            pb_sheet.append_rows(new_rows, value_input_option="USER_ENTERED")

        PB_CACHE = pb_sheet.get("A:ZZ")
        return jsonify({"status": "success"})
    except Exception as e:
        return jsonify({"status": "error", "message": str(e)}), 500


@app.route("/sbgexp/update", methods=["POST"])
def update_sbgexp():
    try:
        global SBGEXP_CACHE
        req_data = request.get_json()
        edit_rows = req_data.get("data", [])
        if not edit_rows:
            return jsonify({"status": "error", "message": "No data received"}), 400

        headers = SBGEXP_CACHE[0]
        body = SBGEXP_CACHE[1:]

        row_map = {}
        for i, r in enumerate(body, start=2):
            if len(r) >= 5:
                key = f"{str(r[0]).strip().lower()}|{str(r[1]).strip().lower()}|{str(r[2]).strip().lower()}|{str(r[3]).strip().lower()}|{str(r[4]).strip().lower()}"
                row_map[key] = i

        updates = []
        new_rows = []

        for obj in edit_rows:
            key = f"{str(obj.get('Date','')).strip().lower()}|{str(obj.get('Station','')).strip().lower()}|{str(obj.get('Bill / Invoice Details','')).strip().lower()}|{str(obj.get('SBG Expenditure Under','')).strip().lower()}|{str(obj.get('Expenditure Details','')).strip().lower()}"
            row_data = [obj.get(h, "") for h in headers]

            if key in row_map:
                row_num = row_map[key]
                updates.append({
                    "range": f"A{row_num}",
                    "values": [row_data]
                })
            else:
                new_rows.append(row_data)

        if updates:
            sbgexp_sheet.batch_update(updates, value_input_option="USER_ENTERED")
        if new_rows:
            sbgexp_sheet.append_rows(new_rows, value_input_option="USER_ENTERED")

        SBGEXP_CACHE = sbgexp_sheet.get("A:ZZ")
        return jsonify({"status": "success"})
    except Exception as e:
        return jsonify({"status": "error", "message": str(e)}), 500


@app.route("/sbg/bulk-update", methods=["POST"])
def bulk_update_sbg():
    try:
        global SBG_CACHE
        req = request.get_json()
        rows = req.get("rows", [])
        if not rows:
            return jsonify({"status": "error", "message": "No rows"}), 400

        headers = SBG_CACHE[0]
        total_cols = len(headers)

        def col_to_letter(n):
            result = ""
            while n > 0:
                n, rem = divmod(n - 1, 26)
                result = chr(65 + rem) + result
            return result

        end_col = col_to_letter(total_cols)
        rows = [r[:total_cols] for r in rows]
        range_name = f"A3:{end_col}{len(rows) + 2}"

        sbg_sheet.batch_update([{"range": range_name, "values": rows}], value_input_option="USER_ENTERED")
        SBG_CACHE = sbg_sheet.get("A:ZZ")
        return jsonify({"status": "success"})
    except Exception as e:
        return jsonify({"status": "error", "message": str(e)}), 500


@app.route("/duty/update", methods=["POST"])
def update_duty():
    try:
        global DUTY_CACHE
        req_data = request.get_json()
        rows = req_data.get("data", [])
        role = (req_data.get("role") or "").upper()
        duty_mode = req_data.get("dutyMode", False)

        if not rows:
            return jsonify({"status": "error", "message": "No data"}), 400

        headers = DUTY_CACHE[0]
        body = DUTY_CACHE[2:]

        date_map = {}
        for i, r in enumerate(body, start=3):
            if r and r[0]:
                date_map[str(r[0]).strip()] = i

        updates = []
        new_rows = []

        for obj in rows:
            date = obj.get("Date")
            if not date:
                continue

            row_data = [""] * len(headers)
            for idx, h in enumerate(headers):
                if h == "Date":
                    row_data[idx] = date
                    continue

                val = obj.get(h, "")
                if role == "MASTER":
                    if (duty_mode and h.endswith("Duty")) or (not duty_mode and ("Requirement" in h or "lieu" in h)):
                        row_data[idx] = val
                elif role == "ENGG" and h.endswith("Duty"):
                    row_data[idx] = val
                elif role not in ["MASTER", "ENGG"] and ("Requirement" in h or "lieu" in h):
                    row_data[idx] = val

            if date in date_map:
                row_num = date_map[date]
                updates.append({
                    "range": f"A{row_num}",
                    "values": [row_data]
                })
            else:
                new_rows.append(row_data)

        if updates:
            duty_sheet.batch_update(updates, value_input_option="USER_ENTERED")
        if new_rows:
            duty_sheet.append_rows(new_rows, value_input_option="USER_ENTERED")

        DUTY_CACHE = duty_sheet.get("A:ZZ")
        return jsonify({"status": "success"})
    except Exception as e:
        return jsonify({"status": "error", "message": str(e)}), 500


@app.route("/eb/update", methods=["POST"])
def update_eb():
    try:
        global EB_CACHE
        req_data = request.get_json()
        rows = req_data.get("data", [])
        if not rows:
            return jsonify({"status": "error", "message": "No data received"}), 400

        headers = EB_CACHE[0]
        body = EB_CACHE[1:]
        month_idx = headers.index("Month-Year") if "Month-Year" in headers else -1
        station_idx = headers.index("EB Station") if "EB Station" in headers else -1

        row_map = {}
        for i, r in enumerate(body, start=2):
            key = f"{str(r[month_idx]).strip().lower()}|{str(r[station_idx]).strip().lower()}"
            row_map[key] = i

        updates = []
        new_rows = []

        for obj in rows:
            key = f"{str(obj.get('Month-Year','')).strip().lower()}|{str(obj.get('EB Station','')).strip().lower()}"
            row_data = [obj.get(h, "") for h in headers]

            if key in row_map:
                row_num = row_map[key]
                updates.append({
                    "range": f"A{row_num}",
                    "values": [row_data]
                })
            else:
                new_rows.append(row_data)

        if updates:
            eb_sheet.batch_update(updates, value_input_option="USER_ENTERED")
        if new_rows:
            eb_sheet.append_rows(new_rows, value_input_option="USER_ENTERED")

        EB_CACHE = eb_sheet.get("A:ZZ")
        return jsonify({"status": "success"})
    except Exception as e:
        return jsonify({"status": "error", "message": str(e)}), 500


@app.route("/dg/update", methods=["POST"])
def update_dg():
    try:
        global DG_CACHE
        req_data = request.get_json()
        rows = req_data.get("data", [])
        if not rows:
            return jsonify({"status": "error", "message": "No data received"}), 400

        headers = DG_CACHE[0]
        body = DG_CACHE[1:]
        entry_idx = headers.index("Entry ID") if "Entry ID" in headers else -1

        row_map = {}
        for i, r in enumerate(body, start=2):
            row_map[str(r[entry_idx]).strip().lower()] = i

        updates = []
        new_rows = []

        for obj in rows:
            entry_id = str(obj.get("Entry ID", "")).strip().lower()
            row_data = [str(obj.get(h, "")) for h in headers]

            if entry_id in row_map:
                row_num = row_map[entry_id]
                updates.append({
                    "range": f"A{row_num}",
                    "values": [row_data]
                })
            else:
                new_rows.append(row_data)

        if updates:
            dg_sheet.batch_update(updates, value_input_option="USER_ENTERED")
        if new_rows:
            dg_sheet.append_rows(new_rows, value_input_option="USER_ENTERED")

        DG_CACHE = dg_sheet.get("A:ZZ")
        return jsonify({"status": "success"})
    except Exception as e:
        return jsonify({"status": "error", "message": str(e)}), 500


@app.route("/health")
def health():
    return "OK", 200

# =========================================================
# 🔄 SILENT BACKGROUND SELF-PING
# =========================================================
SELF_URL = os.environ.get("SELF_URL", "https://office-management-f425.onrender.com/health")

def self_ping():
    while True:
        try:
            requests.get(SELF_URL, timeout=15)
        except Exception:
            pass
        time.sleep(600)

if __name__ == "__main__":
    port = int(os.environ.get("PORT", 5000))
    threading.Thread(target=self_ping, daemon=True).start()
    app.run(host="0.0.0.0", port=port, threaded=True, debug=False)
