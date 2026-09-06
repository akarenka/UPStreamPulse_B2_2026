# StreamPulse Google Cloud Live Stream API backend

This Cloud Run service creates a separate Google Cloud Live Stream input and HLS channel for every existing or newly-created StreamPulse Live Room. The browser never receives Google service-account credentials. Firebase Authentication identifies the caller and Firestore confirms that the caller owns the Room.

## Requirements and billing

Google Cloud Live Stream API is a billed Google Cloud service. The Firebase Spark plan alone is not sufficient: attach a billing account to project `streampulse-3eb7a` before deployment. The output HLS files are written to Cloud Storage and can also incur storage/egress charges.

## Deploy from Google Cloud Shell

1. Select project `streampulse-3eb7a` and open Cloud Shell.
2. Upload this `google-live-backend` folder, then enter it.
3. Create an output bucket in Taiwan (replace the bucket name if it is already taken):

```sh
gcloud config set project streampulse-3eb7a
gcloud services enable livestream.googleapis.com run.googleapis.com cloudbuild.googleapis.com artifactregistry.googleapis.com
gcloud storage buckets create gs://streampulse-live-output-3eb7a --location=asia-east1 --uniform-bucket-level-access
```

4. For public HTML5 HLS playback, grant public object viewing. Do this only for a bucket dedicated to public live output:

```sh
gcloud storage buckets add-iam-policy-binding gs://streampulse-live-output-3eb7a --member=allUsers --role=roles/storage.objectViewer
```

If Public Access Prevention blocks this command, disable it for this dedicated bucket or place a signed-URL/CDN service in front of the bucket.

5. Deploy Cloud Run:

```sh
gcloud run deploy streampulse-google-live --source=. --region=asia-east1 --allow-unauthenticated --timeout=3600 --set-env-vars=LIVE_LOCATION=asia-east1,LIVE_OUTPUT_BUCKET=streampulse-live-output-3eb7a,ALLOWED_ORIGINS=https://akarenka.github.io
```

Cloud Run is publicly reachable so the GitHub Pages browser can call it, but credential creation remains protected by Firebase ID-token verification and Room ownership checks. Do not place a service-account JSON key in this folder.

6. Copy the Cloud Run service URL and add `/api/live-inputs`, for example:

```text
https://streampulse-google-live-xxxxx-de.a.run.app/api/live-inputs
```

7. In `live.html`, sign in to Firebase, enter a Room as its creator, open the creator console, choose **Google Cloud Live Stream API**, paste the URL, and click **Generate**.

## OBS

Use `Settings → Stream → Service: Custom`. Copy the generated Server URL and Stream Key into OBS. The channel is already started by the backend. HLS output can take time to become available after OBS begins sending video.

## Service account roles

Cloud Run normally uses its runtime service account through Application Default Credentials. Grant that identity permission to manage Live Stream resources and write objects to the output bucket. Recommended least-privilege roles are Live Stream Editor and Storage Object Admin on the dedicated output bucket.

## Optional shared access code

Firebase login is preferred. For controlled testing only, Cloud Run may be configured with `CREATOR_API_SECRET`; the browser can then send the same value as Creator API Access Code. Do not commit it to GitHub or put it in `live.html`.
