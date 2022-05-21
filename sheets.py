#!/usr/bin/env python3
## pyright: strict

import itertools as it
import json
import os
import pprint as pp
import sys

import gspread
import requests

# map worksheet names to class years
SHEET_CLASS = {
    "Class of 2021": "2021",
    "Class of 2020": "2020",
}

COLUMNS: tuple[tuple[str, str], ...] = (
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
    ("Post-grad email address", "postGradEmail"),
    ("Phone number", "phoneNumber"),
    ("Facebook profile", "facebookProfile"),
    ("Organization link", "orgLink"),
    ("Summer organization link", "summerOrgLink"),
    ("Comments", "comments"),
    ("", "sepLeft"),
    *([("", "filler")] * 8),
    ("", "sepRight"),
    ("Timestamp", "timestamp"),
    ("Email", "rawEmail"),
    ("Your first and last name", "rawName"),
    ("Your major", "rawMajor"),
    ("What will you be doing next year?", "rawPath"),
    ("At what company, school, or organization?", "rawOrg"),
    ("In what city and state?", "rawCityState"),
    (
        "Would you also like to share where you'll be for the summer?",
        "rawHasSummerPlans",
    ),
    ("What will you be doing?", "rawSummerPlans"),
    (
        "At what company, school, or organization?",
        "rawSummerOrg",
    ),
    ("In what city and state?", "rawSummerCityState"),
    ("Do you want to share more about what you'll be doing?", "rawComments"),
    ("Post-graduation email address", "rawPostGradEmail"),
    ("Phone number", "rawPhoneNumber"),
    ("Show Facebook profile?", "rawShowFacebook"),
    (
        "Check here if you don't want other HMC classes to see your map data",
        "optOutMapData",
    ),
)


COLUMN_INDICES = {key: idx for idx, (_, key) in enumerate(COLUMNS)}
OAUTH_PRIVATE_KEY_PATH = ".oauth-private-key.json"


def get_worksheets() -> list[gspread.Worksheet]:
    # https://gspread.readthedocs.io/en/latest/oauth2.html#using-signed-credentials
    scopes = [
        "https://spreadsheets.google.com/feeds",
        "https://www.googleapis.com/auth/drive",
    ]
    env_key = os.environ.get("LAM_OAUTH_PRIVATE_KEY")
    if env_key:
        client = gspread.service_account_from_dict(json.loads(env_key), scopes)
    else:
        client = gspread.service_account(
            OAUTH_PRIVATE_KEY_PATH,
            scopes,
        )

    sheets = client.open("Life After Mudd").worksheets()
    assert {sh.title for sh in sheets} == {*SHEET_CLASS.keys()}

    return sheets


def read_form_responses(worksheet):
    header, *rows = worksheet.get_all_values()
    expected_header = [name for name, _ in COLUMNS]
    if header != expected_header:
        pp.pprint(
            [
                (i, a, b)
                for i, (a, b) in enumerate(
                    it.zip_longest(expected_header, header)
                )
                if a != b
            ],
            stream=sys.stderr,
        )
        assert False
    return [
        {key: value for (_, key), value in zip(COLUMNS, row)} for row in rows
    ]


def write_form_responses(worksheet: gspread.Worksheet, responses):
    header = worksheet.row_values(1)
    assert header == [name for name, _ in COLUMNS], header
    num_cols = COLUMN_INDICES["sepLeft"]
    if not responses:
        return

    cells = worksheet.range(2, 1, len(responses) + 1, num_cols)
    for cell in cells:
        _, key = COLUMNS[cell.col - 1]
        cell.value = responses[cell.row - 2][key]
    worksheet.update_cells(cells)


def get_unprocessed(responses):
    names = set()
    for batch in responses.values():
        for response in batch:
            if response["processed"] != response["timestamp"]:
                names.add(response["rawName"])
    return names


def download_form_responses():
    print("Downloading form responses...", file=sys.stderr)
    worksheets = get_worksheets()
    responses = {
        SHEET_CLASS[ws.title]: read_form_responses(ws) for ws in worksheets
    }
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
        print(
            "(no Messenger credentials, skipping notification)",
            file=sys.stderr,
        )
    with open("data.json.tmp", "w") as f:
        json.dump(responses, f)
    os.rename("data.json.tmp", "data.json")
    print("... finished downloading form responses", file=sys.stderr)


def upload_form_responses():
    with open("data.json") as f:
        responses = json.load(f)
    sheets = get_worksheets()
    assert {*SHEET_CLASS.values()} == {*responses.keys()}
    for sheet in sheets:
        write_form_responses(sheet, responses[SHEET_CLASS[sheet.title]])


if __name__ == "__main__":
    if sys.argv[1] == "download":
        download_form_responses()
    elif sys.argv[1] == "upload":
        upload_form_responses()
    else:
        print("no such operation", file=sys.stderr)
        sys.exit(1)
