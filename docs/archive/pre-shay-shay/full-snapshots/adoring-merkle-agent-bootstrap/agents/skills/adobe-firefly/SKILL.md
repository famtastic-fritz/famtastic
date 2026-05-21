# Adobe Firefly API — Image Generation Skill

Generate images via Adobe Firefly's REST API. Supports text-to-image,
style reference matching, and batch generation with Content Credentials.

## When to Use

Use this skill when the user asks to generate images using Adobe Firefly,
create product photos, generate image sets with consistent style, or
produce commercially-safe AI images with provenance metadata.

## Prerequisites

Two environment variables must be set:
- `FIREFLY_CLIENT_ID` — from Adobe Developer Console project
- `FIREFLY_CLIENT_SECRET` — from Adobe Developer Console project

Get these at: https://developer.adobe.com/firefly-services/docs/firefly-api/guides/

## Authentication

OAuth 2.0 client credentials flow against Adobe IMS:

```bash
# Get access token
curl -X POST "https://ims-na1.adobelogin.com/ims/token/v3" \
  -d "grant_type=client_credentials" \
  -d "client_id=$FIREFLY_CLIENT_ID" \
  -d "client_secret=$FIREFLY_CLIENT_SECRET" \
  -d "scope=openid,AdobeID,session,additional_info,read_organizations,firefly_api,ff_apis"
```

Response: `{ "access_token": "...", "expires_in": 86399 }`

## API Endpoints

### Text-to-Image (Async)
```
POST https://firefly-api.adobe.io/v3/images/generate-async
Headers:
  Content-Type: application/json
  x-api-key: $FIREFLY_CLIENT_ID
  Authorization: Bearer $ACCESS_TOKEN

Body:
{
  "prompt": "description of image",
  "n": 1,
  "size": { "width": 2048, "height": 2048 },
  "contentClass": "photo",
  "styles": {
    "presets": [],
    "referenceImage": { "source": { "url": "https://..." } }
  }
}
```

### Style Reference
Include a `referenceImage` in the `styles` object to generate images
that match an existing image's style, lighting, and color palette.

### Content Credentials (C2PA)
All Firefly outputs include C2PA metadata automatically — images are
tagged as AI-generated with full provenance chain.

## Batch Workflow

1. Generate anchor image (no style reference)
2. Upload anchor or use its URL as style reference
3. Generate N more images using anchor as style reference
4. All images share lighting, color temperature, composition style

## Output

Images are returned as presigned URLs. Download and save locally.
Typical generation time: 10-30 seconds per image.

## Cost

Firefly API uses generative credits. Free tier includes limited credits.
Enterprise plans include higher volume. Check your Adobe plan for limits.

## Integration Points

- Studio Image Browser tab can search and preview Firefly results
- `scripts/firefly-generate` CLI wrapper for batch operations
- Build pipeline can auto-generate hero images from design brief
