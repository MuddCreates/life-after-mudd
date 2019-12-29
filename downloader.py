#!/usr/bin/env python3

import json
import os

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
        "Your name",
        "Your major",
        "What are you doing?",
        "At what company, school, or organization?",
        "In what city?",
        "Anything else to say?",
    ]
    return [
        {
            "email": row[1],
            "name": row[2],
            "major": row[3],
            "path": row[4],
            "org": row[5],
            "city": row[6],
            "comments": row[7],
        }
        for row in rest
    ]


def download_form_responses():
    responses = parse_form_responses(get_form_responses())
    with open("responses.json.tmp", "w") as f:
        json.dump(responses, f)
    os.rename("responses.json.tmp", "responses.json")


if __name__ == "__main__":
    download_form_responses()
