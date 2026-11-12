import pytest
from app.core import video_id_from_url, stamp

def test_urls():
    assert video_id_from_url("https://youtu.be/dQw4w9WgXcQ") == "dQw4w9WgXcQ"
    assert video_id_from_url("https://www.youtube.com/watch?v=dQw4w9WgXcQ") == "dQw4w9WgXcQ"

def test_reject_other_domains():
    with pytest.raises(ValueError):
        video_id_from_url("https://example.com/watch?v=dQw4w9WgXcQ")

def test_stamp():
    assert stamp(3661) == "01:01:01"
