from flask import Flask, request, jsonify, Response, stream_with_context
from flask_cors import CORS
from oauth2client.service_account import ServiceAccountCredentials
from requests.exceptions import SSLError, ConnectionError, RequestException
import urllib3
from datetime import datetime
from zoneinfo import ZoneInfo
import gspread
import os
import json
import threading
import time
import requests
import socket

# Create aliases for the exceptions to keep your safe_sheet_call logic working
ProtocolError = urllib3.exceptions.ProtocolError
ConnectionResetError = ConnectionResetError # This is a built-in Python exception

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
holiday_sheet  = duty_file.worksheet("Holidays")
coff_sheet  = duty_file.worksheet("CoffList")

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
HOLIDAY_CACHE  = fetch_cache(holiday_sheet)
COFF_CACHE  = fetch_cache(coff_sheet)
print("✅ Caches loaded successfully.")

def cache_to_json(cache_data):
    if not cache_data:
        return {"headers": [], "rows": []}
    return {"headers": cache_data[0], "rows": cache_data[1:]}


# =========================================================
# 🔥 SAFE GOOGLE SHEET RETRY
# =========================================================
def safe_sheet_call(func, retries=5, delay=2):
    last_error = None
    for attempt in range(retries):
        try:
            return func()
        except (SSLError, ProtocolError, ConnectionResetError, socket.error, RequestException) as e:
            print(f"🔁 GOOGLE API RETRY {attempt + 1}/{retries} | ERROR: {str(e)}")
            last_error = e
            time.sleep(delay)
    raise last_error

# =========================================================
# 🔥 GET INTERNET TIME
# =========================================================
@app.route("/time", methods=["GET"])
def get_time():
    return jsonify({
        "serverTime": datetime.now(
            ZoneInfo("Asia/Kolkata")
        ).isoformat()
    })

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

@app.route("/holidays", methods=["GET"])
def get_holidays(): return jsonify(cache_to_json(HOLIDAY_CACHE))

@app.route("/coff", methods=["GET"])
def get_coff(): return jsonify(cache_to_json(COFF_CACHE))

@app.route("/esr", methods=["GET"])
def get_esr(): return jsonify(cache_to_json(ESR_CACHE))

@app.route("/txn", methods=["GET"])
def get_txn(): return jsonify(cache_to_json(TXN_CACHE))


@app.route("/sbgexp", methods=["GET"])
def get_sbgexp():
    global SBGEXP_CACHE
    return jsonify(cache_to_json(SBGEXP_CACHE))


@app.route("/refresh/<api_name>", methods=["POST"])
def refresh_single_module(api_name):

    sheet_map = {
        'emp': emp_sheet,
        'pb': pb_sheet,
        'sbgexp': sbgexp_sheet,
        'sbg': sbg_sheet,
        'dg': dg_sheet,
        'eb': eb_sheet,
        'duty': duty_sheet,
        'holidays': holiday_sheet,
        'coff': coff_sheet,
        'esr': esr_sheet,
        'txn': txn_sheet,
        'hsd': hsd_sheet,
        'cpc': cpc_sheet,
        'city': city_sheet,
        'qtrs': qtrs_sheet,
        'comm': comm_sheet,
        'it': it_sheet
    }

    cache_map = {
        'emp': 'EMP_CACHE',
        'pb': 'PB_CACHE',
        'sbgexp': 'SBGEXP_CACHE',
        'sbg': 'SBG_CACHE',
        'dg': 'DG_CACHE',
        'eb': 'EB_CACHE',
        'duty': 'DUTY_CACHE',
        'holidays': 'HOLIDAY_CACHE',
        'coff': 'COFF_CACHE',
        'esr': 'ESR_CACHE',
        'txn': 'TXN_CACHE',
        'hsd': 'HSD_CACHE',
        'cpc': 'CPC_CACHE',
        'city': 'CITY_CACHE',
        'qtrs': 'QTRS_CACHE',
        'comm': 'COMM_CACHE',
        'it': 'IT_CACHE'
    }

    try:
        if api_name == 'all':

            global EMP_CACHE, PB_CACHE, SBGEXP_CACHE, SBG_CACHE
            global DG_CACHE, EB_CACHE, DUTY_CACHE, HOLIDAY_CACHE, COFF_CACHE
            global ESR_CACHE, TXN_CACHE, HSD_CACHE
            global CPC_CACHE, CITY_CACHE, QTRS_CACHE
            global COMM_CACHE, IT_CACHE

            EMP_CACHE      = fetch_cache(emp_sheet)
            PB_CACHE       = fetch_cache(pb_sheet)
            SBGEXP_CACHE   = fetch_cache(sbgexp_sheet)
            SBG_CACHE      = fetch_cache(sbg_sheet)

            DG_CACHE       = fetch_cache(dg_sheet)
            EB_CACHE       = fetch_cache(eb_sheet)
            DUTY_CACHE     = fetch_cache(duty_sheet)
            HOLIDAY_CACHE  = fetch_cache(holiday_sheet)
            COFF_CACHE     = fetch_cache(coff_sheet)

            ESR_CACHE      = fetch_cache(esr_sheet)
            TXN_CACHE      = fetch_cache(txn_sheet)
            HSD_CACHE      = fetch_cache(hsd_sheet)

            CPC_CACHE      = fetch_cache(cpc_sheet)
            CITY_CACHE     = fetch_cache(city_sheet)
            QTRS_CACHE     = fetch_cache(qtrs_sheet)
            COMM_CACHE     = fetch_cache(comm_sheet)
            IT_CACHE       = fetch_cache(it_sheet)

            print("✅ All caches refreshed")

        elif api_name in sheet_map:
            data = fetch_cache(sheet_map[api_name])
            globals()[cache_map[api_name]] = data
            print(f"✅ Cache refreshed: {api_name}")

        else:
            return jsonify({
                "status": "error",
                "message": f"Unknown module: {api_name}"
            }), 400

        return jsonify({
            "status": "success",
            "refreshed": api_name
        })

    except Exception as e:
        print(f"❌ Refresh failed: {api_name} | {str(e)}")

        return jsonify({
            "status": "error",
            "message": str(e)
        }), 500

@app.route("/refresh/reference", methods=["POST"])
def refresh_reference():

    global CPC_CACHE, CITY_CACHE, QTRS_CACHE
    global COMM_CACHE, IT_CACHE, HOLIDAY_CACHE

    CPC_CACHE      = fetch_cache(cpc_sheet)
    CITY_CACHE     = fetch_cache(city_sheet)
    QTRS_CACHE     = fetch_cache(qtrs_sheet)
    COMM_CACHE     = fetch_cache(comm_sheet)
    IT_CACHE       = fetch_cache(it_sheet)
    HOLIDAY_CACHE  = fetch_cache(holiday_sheet)

    return jsonify({
        "status": "success",
        "refreshed": "reference"
    })

# =========================================================
# 🔐 LOGIN API
# =========================================================
ROLE_USERS = [
    {"user": "MASTER", "password": "master@11051993"},
    {"user": "ENGG", "password": "engg@225344"},
    {"user": "ADMIN", "password": "admin@221902"}
]

@app.route("/login", methods=["POST"])
def login():
    try:
        data = request.get_json()

        station = (data.get("station") or "").strip()
        user = (data.get("user") or "").strip()
        password = (data.get("password") or "").strip()

        # =====================================================
        # 1. CHECK ROLE USERS
        # =====================================================
        role_user = next(
            (
                r for r in ROLE_USERS
                if r["user"].strip().upper() == user.upper()
                and r["password"] == password
            ),
            None
        )

        if role_user:
            return jsonify({
                "success": True,
                "user": role_user["user"],
                "displayName": role_user["user"],
                "station": station,
                "role": role_user["user"]
            })

        # =====================================================
        # 2. CHECK EMPLOYEE USERS USING HRIS + PASSWORD
        # =====================================================
        employees = [
            dict(zip(EMP_CACHE[0], row))
            for row in EMP_CACHE[1:]
        ]

        found_user = next(
            (
                emp for emp in employees
                if str(emp.get("HRIS", "")).strip() == str(user).strip()
                and str(emp.get("Password", "")).strip() == password
            ),
            None
        )

        if found_user:
            return jsonify({
                "success": True,
                "user": found_user.get("Initials", ""),
                "displayName": found_user.get("Employee Name", ""),
                "station": station,
                "role": "USER",
                "hris": found_user.get("HRIS", "")
            })

        # =====================================================
        # INVALID LOGIN
        # =====================================================
        return jsonify({
            "success": False,
            "message": "Invalid user credentials"
        })

    except Exception as e:
        print("❌ Login Error:", str(e))
        return jsonify({
            "success": False,
            "message": str(e)
        }), 500

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

        # 1. Build a map of existing data for quick lookups
        row_map = {}
        for i, r in enumerate(body, start=2):
            key = str(r[month_idx]).strip().lower()
            if hris_idx >= 0 and hris_idx < len(r):
                key += f"|{str(r[hris_idx]).strip().lower()}"
            row_map[key] = {"row_num": i, "data": r}

        updates = []
        new_rows = []
        updated_employees = []
        added_employees = []

        # 2. Iterate through incoming frontend data
        for obj in edit_rows:
            emp_name = str(obj.get("Employee Name", "Unknown")).strip()
            sal_month = str(obj.get("Salary Month", "")).strip()

            key = sal_month.lower()
            if hris_idx >= 0:
                key += f"|{str(obj.get('HRIS', '')).strip().lower()}"

            if key in row_map:
                # --- UPDATE EXISTING ---
                row_num = row_map[key]["row_num"]
                existing_data = row_map[key]["data"]
                padded_existing = existing_data + [""] * (len(headers) - len(existing_data))

                row_data = []
                changed_cols = []

                for col_idx, h in enumerate(headers):
                    incoming_val = str(obj.get(h, "")).strip()
                    existing_val = str(padded_existing[col_idx]).strip()

                    # 🔥 NON-DESTRUCTIVE RULE:
                    # If incoming is empty but existing has data, keep existing.
                    if incoming_val == "" and existing_val != "":
                        row_data.append(existing_val)
                    else:
                        row_data.append(incoming_val)
                        if incoming_val.upper() != existing_val.upper():
                            changed_cols.append(h)

                if changed_cols:
                    updates.append({"range": f"A{row_num}", "values": [row_data]})
                    updated_employees.append({"employee": emp_name, "month": sal_month, "changedColumns": changed_cols})

            else:
                # --- ADD NEW ROW ---
                row_data = [str(obj.get(h, "")).strip() for h in headers]
                new_rows.append(row_data)
                added_employees.append({"employee": emp_name, "month": sal_month})

        # 3. Commit to Database
        if not updates and not new_rows:
            return jsonify({"status": "nochange"})

        if updates:
            pb_sheet.batch_update(updates, value_input_option="USER_ENTERED")
        if new_rows:
            pb_sheet.append_rows(new_rows, value_input_option="USER_ENTERED")

        # 4. Refresh Cache
        PB_CACHE = pb_sheet.get("A:ZZ")

        return jsonify({
            "status": "success",
            "updatedEmployees": updated_employees,
            "addedEmployees": added_employees
        })

    except Exception as e:
        print("❌ PB Update Error:", str(e))
        return jsonify({"status": "error", "message": str(e)}), 500


@app.route("/sbgexp/update", methods=["POST"])
def update_sbgexp():
    try:
        global SBGEXP_CACHE
        req_data = request.get_json()
        edit_rows = req_data.get("data", [])
        mode = req_data.get("mode", "sync")

        if not edit_rows:
            return jsonify({"status": "error", "message": "No data received"}), 400

        data = safe_sheet_call(lambda: sbgexp_sheet.get_all_values())
        headers, rows = data[0], data[1:]
        last_updated_idx = headers.index("Last Updated") if "Last Updated" in headers else -1

        def normalize(val):
            if val is None: return ""
            val = str(val).replace("₹", "").replace(",", "").replace("\r", "").replace("\n", " ").strip().lower()
            if val in ["true", "yes", "checked", "1"]: return "true"
            if val in ["false", "no", "0", "unchecked"]: return "false"
            if val in ["--", "-"]: return ""
            try: return f"{float(val):.3f}"
            except: return val

        update_cells, new_rows = [], []
        updated_rows, added_rows, conflicts = [], [], []

        for row_obj in edit_rows:
            row_num = row_obj.get("_RowIndex")

            # 🔄 SYNC MODE
            if mode == "sync":
                matched_row = None
                for idx, existing_row in enumerate(rows):
                    try:
                        while len(existing_row) < len(headers): existing_row.append("")
                        if (normalize(existing_row[0]) == normalize(row_obj.get("Date", "")) and
                            normalize(existing_row[1]) == normalize(row_obj.get("Station", "")) and
                            normalize(existing_row[2]) == normalize(row_obj.get("Bill / Invoice Details", "")) and
                            normalize(existing_row[3]) == normalize(row_obj.get("SBG Expenditure Under", "")) and
                            normalize(existing_row[4]) == normalize(row_obj.get("Expenditure Details", ""))):
                            matched_row = idx + 2
                            break
                    except: pass

                if matched_row:
                    existing_row = rows[matched_row - 2]
                    merged_row = existing_row.copy()
                    for col_idx, header in enumerate(headers):
                        if header in row_obj: merged_row[col_idx] = row_obj.get(header, "")

                    changed_columns = [h for i, h in enumerate(headers) if h != "Last Updated" and normalize(existing_row[i]) != normalize(merged_row[i])]
                    if not changed_columns: continue

                    if last_updated_idx >= 0: merged_row[last_updated_idx] = datetime.now().isoformat()
                    update_cells.append({"range": f"A{matched_row}:{gspread.utils.rowcol_to_a1(matched_row, len(headers))}", "values": [merged_row]})
                    updated_rows.append({"date": row_obj.get("Date", ""), "station": row_obj.get("Station", ""), "budget": row_obj.get("SBG Expenditure Under", ""), "amount": row_obj.get("Expenditure Amount (₹ in 000)", ""), "monthlyCumulative": row_obj.get("Monthly Cumulative Sum of Expenditure (₹ in 000)", ""), "cumulative": row_obj.get("Cumulative Sum of Expenditure (₹ in 000)", ""), "changedColumns": changed_columns})
                else:
                    new_row = [datetime.now().isoformat() if h == "Last Updated" else row_obj.get(h, "") for h in headers]
                    new_rows.append(new_row)
                    added_rows.append({"date": row_obj.get("Date", ""), "station": row_obj.get("Station", ""), "budget": row_obj.get("SBG Expenditure Under", ""), "amount": row_obj.get("Expenditure Amount (₹ in 000)", ""), "monthlyCumulative": row_obj.get("Monthly Cumulative Sum of Expenditure (₹ in 000)", ""), "cumulative": row_obj.get("Cumulative Sum of Expenditure (₹ in 000)", "")})

            # 🔄 EDIT MODE
            elif mode == "edit" and row_num:
                try:
                    row_num = int(row_num)
                    existing_row = rows[row_num - 2]
                    if last_updated_idx >= 0 and existing_row[last_updated_idx] != row_obj.get("_lastUpdated", ""):
                        conflicts.append({"row": row_num, "station": row_obj.get("Station", "")}); continue

                    merged_row = [row_obj.get(h, existing_row[i] if i < len(existing_row) else "") for i, h in enumerate(headers)]
                    changed_columns = [h for i, h in enumerate(headers) if h not in ["Last Updated", "_lastUpdated"] and normalize(existing_row[i]) != normalize(merged_row[i])]

                    if not changed_columns: continue
                    if last_updated_idx >= 0: merged_row[last_updated_idx] = datetime.now().isoformat()

                    update_cells.append({"range": f"A{row_num}:{gspread.utils.rowcol_to_a1(row_num, len(headers))}", "values": [merged_row]})
                    updated_rows.append({"date": row_obj.get("Date", ""), "station": row_obj.get("Station", ""), "budget": row_obj.get("SBG Expenditure Under", ""), "amount": row_obj.get("Expenditure Amount (₹ in 000)", ""), "monthlyCumulative": row_obj.get("Monthly Cumulative Sum of Expenditure (₹ in 000)", ""), "cumulative": row_obj.get("Cumulative Sum of Expenditure (₹ in 000)", ""), "changedColumns": changed_columns})
                except: pass

            # ➕ ADD MODE
            else:
                new_row = [datetime.now().isoformat() if h == "Last Updated" else row_obj.get(h, "") for h in headers]
                new_rows.append(new_row)
                added_rows.append({"date": row_obj.get("Date", ""), "station": row_obj.get("Station", ""), "budget": row_obj.get("SBG Expenditure Under", ""), "amount": row_obj.get("Expenditure Amount (₹ in 000)", ""), "monthlyCumulative": row_obj.get("Monthly Cumulative Sum of Expenditure (₹ in 000)", ""), "cumulative": row_obj.get("Cumulative Sum of Expenditure (₹ in 000)", "")})

        if not update_cells and not new_rows:
            return jsonify({"status": "nochange"})

        # =====================================================
        # 🔥 APPLY UPDATES & SORT (CLEAN VERSION)
        # =====================================================

        # 1. Apply batch updates for existing rows
        if update_cells:
            safe_sheet_call(lambda: sbgexp_sheet.batch_update(update_cells, value_input_option="USER_ENTERED"))

        # 2. Append new rows (these are only data, no headers)
        if new_rows:
            safe_sheet_call(lambda: sbgexp_sheet.append_rows(new_rows, value_input_option="USER_ENTERED"))

        # 3. Reload everything to get the full, updated set
        latest_data = safe_sheet_call(lambda: sbgexp_sheet.get_all_values())
        if latest_data and len(latest_data) > 1:
            headers = latest_data[0] # Save headers separately
            body = latest_data[1:]   # Data only

            # 4. Sort only the data
            sorted_body = sorted(body, key=lambda r: (
                datetime.strptime(r[0], "%d-%m-%Y") if r[0] else datetime.min,
                str(r[1]).lower(), str(r[3]).lower()
            ))

            # 5. CLEAR ALL DATA in the sheet starting from A2
            # This is safer than delete_rows.
            safe_sheet_call(lambda: sbgexp_sheet.batch_clear(['A2:Z10000']))

            # 6. Write ONLY the sorted body
            safe_sheet_call(lambda: sbgexp_sheet.update('A2', sorted_body, value_input_option="USER_ENTERED"))

        return jsonify({"status": "conflict" if conflicts else "success", "updatedRows": updated_rows, "addedRows": added_rows, "rows": conflicts})

    except Exception as e:
        print("❌ SBG UPDATE ERROR:", str(e))
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


@app.route("/coff/bulk-update", methods=["POST"])
def update_coff():

    global COFF_CACHE

    try:

        data = request.get_json(force=True)

        new_rows = data.get("rows", [])

        if not new_rows:
            return jsonify({
                "status": "success",
                "updated": 0,
                "added": 0
            })

        sheet_data = fetch_cache(coff_sheet)

        if not sheet_data:

            headers = [
                "Employee Name",
                "Leave Type",
                "Claimed Date",
                "Duty Date",
                "Actual Duty",
                "Extra Duty",
                "Details"
            ]

            coff_sheet.update("A1:G1", [headers])

            sheet_data = [headers]

        existing_rows = sheet_data[1:]

        # ==========================================
        # BUILD LOOKUP
        # ==========================================

        row_map = {}

        for sheet_row_num, row in enumerate(existing_rows, start=2):

            row = row + [""] * (7 - len(row))

            key = (
                f"{str(row[0]).strip()}|"
                f"{str(row[1]).strip()}|"
                f"{str(row[2]).strip()}|"
                f"{str(row[3]).strip()}"
            )

            row_map[key] = {
                "row_num": sheet_row_num,
                "data": row[:7]
            }

        updates = []
        appends = []

        # ==========================================
        # PROCESS INCOMING ROWS
        # ==========================================

        for row in new_rows:

            row = list(row) + [""] * (7 - len(row))
            row = row[:7]

            key = (
                f"{str(row[0]).strip()}|"
                f"{str(row[1]).strip()}|"
                f"{str(row[2]).strip()}|"
                f"{str(row[3]).strip()}"
            )

            # --------------------------------------
            # EXISTING ROW
            # --------------------------------------

            if key in row_map:

                existing = row_map[key]["data"]

                if existing != row:

                    updates.append(
                        (
                            row_map[key]["row_num"],
                            row
                        )
                    )

                    row_map[key]["data"] = row

            # --------------------------------------
            # NEW ROW
            # --------------------------------------

            else:

                appends.append(row)

                # prevent duplicate append in same request
                row_map[key] = {
                    "row_num": -1,
                    "data": row
                }

        # ==========================================
        # UPDATE CHANGED ROWS
        # ==========================================

        for row_num, row_data in updates:

            coff_sheet.update(
                f"A{row_num}:G{row_num}",
                [row_data]
            )

        # ==========================================
        # APPEND NEW ROWS
        # ==========================================

        if appends:

            coff_sheet.append_rows(appends)

        # ==========================================
        # REFRESH CACHE
        # ==========================================

        COFF_CACHE = fetch_cache(coff_sheet)

        print(
            f"✅ Coff Sync Complete | "
            f"Updated: {len(updates)} | "
            f"Added: {len(appends)}"
        )

        return jsonify({
            "status": "success",
            "updated": len(updates),
            "added": len(appends)
        })

    except Exception as e:

        print(f"❌ Coff Update Failed: {e}")

        return jsonify({
            "status": "error",
            "message": str(e)
        }), 500


@app.route("/eb/update", methods=["POST"])
def update_eb():
    try:
        global EB_CACHE
        req_data = request.get_json()
        edit_rows = req_data.get("data", [])

        # 1. Safety: Guard against empty request or uninitialized cache
        if not edit_rows:
            return jsonify({"status": "error", "message": "No data received"}), 400
        if not EB_CACHE or len(EB_CACHE) < 1:
            return jsonify({"status": "error", "message": "EB Cache not initialized"}), 500

        headers = EB_CACHE[0]
        # 2. Safety: Validate headers exist
        if "Month-Year" not in headers or "EB Station" not in headers:
            return jsonify({"status": "error", "message": "Required columns missing in Sheet"}), 400

        month_idx = headers.index("Month-Year")
        station_idx = headers.index("EB Station")

        # 3. Create Map
        row_map = {f"{str(r[month_idx]).strip().lower()}|{str(r[station_idx]).strip().lower()}": {"row_num": i, "data": r}
                   for i, r in enumerate(EB_CACHE[1:], start=2)}

        updates, new_rows = [], []
        updated, added = [], []

        for obj in edit_rows:
            key = f"{str(obj.get('Month-Year','')).strip().lower()}|{str(obj.get('EB Station','')).strip().lower()}"
            # Ensure row_data aligns perfectly with headers
            row_data = [str(obj.get(h, "")) for h in headers]

            if key in row_map:
                old_row = row_map[key]["data"]
                # Pad for safety
                padded_old = old_row + [""] * (len(headers) - len(old_row))

                # Check for changes
                changed = [headers[i] for i in range(len(headers)) if str(padded_old[i]).strip() != str(row_data[i]).strip()]

                if changed:
                    updates.append({"range": f"A{row_map[key]['row_num']}", "values": [row_data]})
                    updated.append({"month": obj.get('Month-Year'), "changedColumns": changed})
            else:
                new_rows.append(row_data)
                added.append({"month": obj.get('Month-Year')})

        # 4. Atomic Commit
        if not updates and not new_rows:
            return jsonify({"status": "nochange"})

        if updates: eb_sheet.batch_update(updates, value_input_option="USER_ENTERED")
        if new_rows: eb_sheet.append_rows(new_rows, value_input_option="USER_ENTERED")

        # 5. Refresh Cache
        EB_CACHE = eb_sheet.get("A:ZZ")
        return jsonify({"status": "success", "updated": updated, "added": added})

    except Exception as e:
        return jsonify({"status": "error", "message": str(e)}), 500


@app.route("/dg/update", methods=["POST"])
def update_dg():
    try:
        global DG_CACHE
        req_data = request.get_json()
        edit_rows = req_data.get("data", [])

        # 1. Safety Guard: Return early if no data
        if not edit_rows:
            return jsonify({"status": "error", "message": "No data received"}), 400

        # 2. Safety Guard: Ensure cache exists
        if not DG_CACHE or len(DG_CACHE) == 0:
            return jsonify({"status": "error", "message": "DG Cache is empty"}), 500

        headers = DG_CACHE[0]
        # Use .get to avoid ValueError if "Entry ID" is missing
        if "Entry ID" not in headers:
            return jsonify({"status": "error", "message": "Header 'Entry ID' not found"}), 400

        entry_idx = headers.index("Entry ID")
        row_map = {str(r[entry_idx]).strip().lower(): {"row_num": i, "data": r}
                   for i, r in enumerate(DG_CACHE[1:], start=2)}

        updates, new_rows = [], []
        updated, added = [], []

        for obj in edit_rows:
            eid = str(obj.get("Entry ID", "")).strip().lower()
            # Ensure row_data matches exact length of headers to prevent spreadsheet errors
            row_data = [str(obj.get(h, "")) for h in headers]

            if eid in row_map:
                old_row = row_map[eid]["data"]
                # Padded comparison to handle rows shorter than headers
                padded_old = old_row + [""] * (len(headers) - len(old_row))

                changed = [headers[i] for i in range(len(headers)) if str(padded_old[i]).strip() != str(row_data[i]).strip()]

                if changed:
                    updates.append({"range": f"A{row_map[eid]['row_num']}", "values": [row_data]})
                    updated.append({"date": obj.get('Date'), "changedColumns": changed})
            else:
                new_rows.append(row_data)
                added.append({"date": obj.get('Date')})

        # 3. Commit only if work exists
        if not updates and not new_rows:
            return jsonify({"status": "nochange"})

        if updates:
            dg_sheet.batch_update(updates, value_input_option="USER_ENTERED")
        if new_rows:
            dg_sheet.append_rows(new_rows, value_input_option="USER_ENTERED")

        # 4. Refresh Cache
        DG_CACHE = dg_sheet.get("A:ZZ")

        return jsonify({"status": "success", "updated": updated, "added": added})

    except Exception as e:
        return jsonify({"status": "error", "message": str(e)}), 500


@app.route("/fetch/dg", methods=["GET"])
def refresh_dg():
    global DG_CACHE
    try:
        DG_CACHE = dg_sheet.get("A:ZZ")
        return jsonify({"headers": DG_CACHE[0], "rows": DG_CACHE[1:]})
    except Exception as e:
        return jsonify({"status": "error", "message": str(e)}), 500

@app.route("/fetch/eb", methods=["GET"])
def refresh_eb():
    global EB_CACHE
    try:
        EB_CACHE = eb_sheet.get("A:ZZ")
        return jsonify({"headers": EB_CACHE[0], "rows": EB_CACHE[1:]})
    except Exception as e:
        return jsonify({"status": "error", "message": str(e)}), 500

@app.route("/fetch/pb", methods=["GET"])
def refresh_pb():
    global PB_CACHE
    try:
        PB_CACHE = pb_sheet.get("A:ZZ")
        return jsonify({"headers": PB_CACHE[0], "rows": PB_CACHE[1:]})
    except Exception as e:
        return jsonify({"status": "error", "message": str(e)}), 500

@app.route("/fetch/duty", methods=["GET"])
def refresh_duty():
    global DUTY_CACHE
    try:
        DUTY_CACHE = duty_sheet.get("A:ZZ")
        return jsonify({"headers": DUTY_CACHE[0], "rows": DUTY_CACHE[1:]})
    except Exception as e:
        return jsonify({"status": "error", "message": str(e)}), 500

@app.route("/fetch/sbg", methods=["GET"])
def refresh_sbg():
    global SBG_CACHE
    try:
        SBG_CACHE = sbg_sheet.get("A:ZZ")
        return jsonify({"headers": SBG_CACHE[0], "rows": SBG_CACHE[1:]})
    except Exception as e:
        return jsonify({"status": "error", "message": str(e)}), 500

@app.route("/fetch/sbgexp", methods=["GET"])
def refresh_sbgexp():
    global SBGEXP_CACHE
    try:
        SBGEXP_CACHE = sbgexp_sheet.get("A:ZZ")
        return jsonify({"headers": SBGEXP_CACHE[0], "rows": SBGEXP_CACHE[1:]})
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
