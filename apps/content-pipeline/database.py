import json
import os
from pathlib import Path

DB_PATH = Path(os.environ.get("DB_PATH", "./data/pipeline.json"))


def _load() -> dict:
    if DB_PATH.exists():
        return json.loads(DB_PATH.read_text())
    return {"chapters": {}, "drafts": {}, "status": {}}


def _save(data: dict):
    DB_PATH.parent.mkdir(parents=True, exist_ok=True)
    DB_PATH.write_text(json.dumps(data, indent=2))


def get_all_chapters() -> list[dict]:
    return list(_load()["chapters"].values())


def get_chapter(chapter_id: str) -> dict | None:
    return _load()["chapters"].get(chapter_id)


def save_chapter(chapter: dict):
    data = _load()
    data["chapters"][chapter["id"]] = chapter
    _save(data)


def delete_chapter(chapter_id: str):
    data = _load()
    data["chapters"].pop(chapter_id, None)
    data["drafts"].pop(chapter_id, None)
    data["status"].pop(chapter_id, None)
    _save(data)


def get_status(chapter_id: str) -> dict | None:
    return _load()["status"].get(chapter_id)


def save_status(chapter_id: str, status: dict):
    data = _load()
    data["status"][chapter_id] = status
    _save(data)


def get_draft(chapter_id: str) -> dict | None:
    return _load()["drafts"].get(chapter_id)


def save_draft(chapter_id: str, draft: dict):
    data = _load()
    data["drafts"][chapter_id] = draft
    _save(data)
