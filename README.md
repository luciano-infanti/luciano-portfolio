# Luciano Portfolio

Next.js App Router portfolio built from the Figma structure, with Tailwind CSS and image handling ready for Vercel.

## Run locally

```bash
npm install
npm run dev
```

## Add the final font

Place the Aktiv Grotesk Corp font files in `public/fonts`, then update `--font-body` in `app/globals.css`.

## Add or remove projects

Create a folder in `public/works`, add a `project.json`, then drop images or videos into the same folder. The homepage discovers projects automatically at build time.

```json
{
  "order": 10,
  "name": "Savee",
  "whatIDid": "Product Design, Motion, Prototyping, Branding",
  "company": "Metalab",
  "year": "2024"
}
```

Supported media: `.png`, `.jpg`, `.jpeg`, `.webp`, `.avif`, `.gif`, `.mp4`, `.webm`, `.mov`.
