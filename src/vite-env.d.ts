/// <reference types="vite/client" />

interface ImportMetaEnv {
  /** ポンコツ LLM の API キー（.env で定義。ビルド時に注入される） */
  readonly VITE_PONKOTSU_API_KEY?: string
}

interface ImportMeta {
  readonly env: ImportMetaEnv
}
