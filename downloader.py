import json

import gspread
import oauth2client.service_account


def get_form_responses():
    # https://gspread.readthedocs.io/en/latest/oauth2.html#using-signed-credentials
    scopes = [
        "https://spreadsheets.google.com/feeds",
        "https://www.googleapis.com/auth/drive",
    ]
    creds = oauth2client.service_account.ServiceAccountCredentials.from_json_keyfile_name(
        ".oauth-private-key.json", scopes
    )
    gc = gspread.authorize(creds)
    worksheet = gc.open("Life after Mudd").get_worksheet(0)
    return worksheet.get_all_values()


def parse_form_responses(responses):
    header, *rest = responses
    # If the form is changed we need to update the code here, so throw
    # an error in that case.
    assert header == [
        "Timestamp",
        "Email Address",
        "Your major",
        "What are you doing?",
        "At what company, school, or organization?",
        "In what city or state?",
        "Anything else to say?",
    ]
    return [
        {
            "email": row[1],
            "major": row[2],
            "path": row[3],
            "org": row[4],
            "location": row[5],
            "comments": row[6],
        }
        for row in rest
    ]
