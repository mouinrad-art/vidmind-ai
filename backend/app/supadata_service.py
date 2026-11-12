
import os
import time
import requests

BASE_URL = "https://api.supadata.ai/v1"


def get_supadata_transcript(video_url: str):
    api_key = os.getenv("SUPADATA_API_KEY")

    if not api_key:
        raise RuntimeError("SUPADATA_API_KEY is not configured")

    headers = {"x-api-key": api_key}

    response = requests.get(
        f"{BASE_URL}/transcript",
        headers=headers,
        params={
            "url": video_url,
            "mode": "auto",
            "text": "false",
        },
        timeout=60,
    )
    response.raise_for_status()
    data = response.json()

    # Longer videos can require asynchronous processing.
    if response.status_code == 202:
        job_id = data["jobId"]

        for _ in range(30):
            time.sleep(3)

            job_response = requests.get(
                f"{BASE_URL}/transcript/{job_id}",
                headers=headers,
                timeout=30,
            )
            job_response.raise_for_status()
            data = job_response.json()

            if data.get("status") == "completed":
                data = data.get("result", data)
                break

            if data.get("status") == "failed":
                raise RuntimeError("Transcript processing failed")
        else:
            raise TimeoutError("Transcript is still processing")

    content = data.get("content", [])

    if not isinstance(content, list):
        raise ValueError("Expected timestamped transcript segments")

    return [
        {
            "text": segment["text"],
            "start": segment["offset"] / 1000,
            "duration": segment.get("duration", 0) / 1000,
        }
        for segment in content
    ]
