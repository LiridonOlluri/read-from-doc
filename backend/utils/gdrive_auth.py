import json
from google.oauth2 import service_account
from googleapiclient.discovery import build

SCOPES = ["https://www.googleapis.com/auth/drive.readonly"]


def build_drive_service(service_account_json: str):
    """
    Build a Google Drive v3 service client from a service account JSON string.
    Raises ValueError if JSON is invalid or missing required fields.
    """
    try:
        creds_dict = json.loads(service_account_json)
    except json.JSONDecodeError as exc:
        raise ValueError(f"Invalid JSON: {exc}") from exc

    required_fields = {"type", "project_id", "private_key", "client_email"}
    missing = required_fields - creds_dict.keys()
    if missing:
        raise ValueError(f"Service account JSON missing fields: {missing}")

    credentials = service_account.Credentials.from_service_account_info(
        creds_dict, scopes=SCOPES
    )
    return build("drive", "v3", credentials=credentials, cache_discovery=False)
