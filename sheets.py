#!/usr/bin/env python3

import json
import os
import sys

import gspread
import oauth2client.service_account
import requests


COLUMNS = (
    ("Timestamp", "timestamp"),
    ("Email Address", "rawEmail"),
    ("Your first and last name", "rawName"),
    ("Your major", "rawMajor"),
    ("What will you be doing next year?", "rawPath"),
    ("At what company, school, or organization?", "rawOrg"),
    ("In what city and state?", "rawCityState"),
    ("Do you have separate summer plans you'd like to share?", "rawHasSummerPlans"),
    ("What will you be doing?", "rawSummerPlans"),
    ("At what company, school, or organization?", "rawSummerOrg",),
    ("In what city and state?", "rawSummerCityState"),
    ("Anything else you want to share?", "rawComments"),
    ("", "blank"),
    ("Processed", "processed"),
    ("Email", "email"),
    ("Name", "name"),
    ("Major", "major"),
    ("Path", "path"),
    ("Organization", "org"),
    ("Organization latitude", "orgLat"),
    ("Organization longitude", "orgLong"),
    ("City", "city"),
    ("State", "state"),
    ("Country", "country"),
    ("City latitude", "cityLat"),
    ("City longitude", "cityLong"),
    ("Summer plans", "summerPlans"),
    ("Summer organization", "summerOrg"),
    ("Summer organization latitude", "summerOrgLat"),
    ("Summer organization longitude", "summerOrgLong"),
    ("Summer city", "summerCity"),
    ("Summer state", "summerState"),
    ("Summer country", "summerCountry"),
    ("Summer city latitude", "summerCityLat"),
    ("Summer city longitude", "summerCityLong"),
    ("Comments", "comments"),
)


COLUMN_INDICES = {key: idx for idx, (_, key) in enumerate(COLUMNS)}


def get_worksheet():
    # https://gspread.readthedocs.io/en/latest/oauth2.html#using-signed-credentials
    scopes = [
        "https://spreadsheets.google.com/feeds",
        "https://www.googleapis.com/auth/drive",
    ]
    env_key = os.environ.get("LAM_OAUTH_PRIVATE_KEY")
    if env_key:
        creds = oauth2client.service_account.ServiceAccountCredentials.from_json_keyfile_dict(
            json.loads(env_key), scopes
        )
    else:
        creds = oauth2client.service_account.ServiceAccountCredentials.from_json_keyfile_name(
            ".oauth-private-key.json", scopes,
        )
    return gspread.authorize(creds).open("Life After Mudd").get_worksheet(0)


def read_form_responses(worksheet):
    header, *rows = worksheet.get_all_values()
    expected_header = [name for name, _ in COLUMNS]
    if header != expected_header:
        for x, y in zip(expected_header, header):
            if x != y:
                print("expected {}, got {}".format(x, y), file=sys.stderr)
        assert False
    return [{key: value for (_, key), value in zip(COLUMNS, row)} for row in rows]


def write_form_responses(worksheet, responses):
    header = worksheet.row_values(1)
    assert header == [name for name, _ in COLUMNS], header
    cells = worksheet.range(
        2, COLUMN_INDICES["blank"] + 2, len(responses) + 1, len(COLUMNS)
    )
    for cell in cells:
        cell.value = responses[cell.row - 2][COLUMNS[cell.col - 1][1]]
    worksheet.update_cells(cells)


def get_unprocessed(responses):
    names = set()
    for response in responses:
        if response["processed"] != response["timestamp"]:
            names.add(response["rawName"])
    return names


def download_form_responses():
    print("Downloading form responses...", file=sys.stderr)
    worksheet = get_worksheet()
    responses = read_form_responses(worksheet)
    messenger_key = os.environ.get("MESSENGER_PAGE_KEY")
    messenger_user_id = os.environ.get("MESSENGER_USER_ID")
    if messenger_key and messenger_user_id:
        try:
            with open("data.json") as f:
                old_responses = json.load(f)
            old_names = get_unprocessed(old_responses)
        except FileNotFoundError:
            print("(first fetch)", file=sys.stderr)
            old_names = set()
        new_names = get_unprocessed(responses)
        added_names = sorted(new_names - old_names)
        if added_names:
            plural = "s" if len(added_names) != 1 else ""
            not_plural = "" if len(added_names) != 1 else "s"
            print(
                f"Notifying to Messenger ID {messenger_user_id} about "
                f"{len(added_names)} new response{plural}",
                file=sys.stderr,
            )
            list_str = ", ".join(added_names)
            details = ""
            try:
                resp = requests.post(
                    "https://graph.facebook.com/v2.6/me/messages",
                    params={"access_token": messenger_key},
                    json={
                        "recipient": {"id": messenger_user_id},
                        "message": {
                            "text": f"Form response{plural} need{not_plural} attention: {list_str}"
                        },
                        # Dumb workaround to so-called Facebook
                        # "policy", see
                        # <https://developers.facebook.com/docs/messenger-platform/send-messages/message-tags>.
                        "messaging_type": "MESSAGE_TAG",
                        "tag": "CONFIRMED_EVENT_UPDATE",
                    },
                    timeout=5,
                )
                details = " " + resp.text
                resp.raise_for_status()
            except requests.exceptions.RequestException as e:
                print(f"Notification failed: {e}{details}", file=sys.stderr)
        else:
            print("(no change since last time)", file=sys.stderr)
    else:
        print("(no Messenger credentials, skipping notification)", file=sys.stderr)
    with open("data.json.tmp", "w") as f:
        json.dump(responses, f)
    os.rename("data.json.tmp", "data.json")
    print("... finished downloading form responses", file=sys.stderr)


def upload_form_responses():
    with open("data.json") as f:
        responses = json.load(f)
    worksheet = get_worksheet()
    write_form_responses(worksheet, responses)


if __name__ == "__main__":
    if sys.argv[1] == "download":
        download_form_responses()
    elif sys.argv[1] == "upload":
        upload_form_responses()
    else:
        print("no such operation", file=sys.stderr)
        sys.exit(1)
