import { useCallback, useEffect, useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import { RigidBody } from '@react-three/rapier'
import { Container, Text } from '@react-three/uikit'
import {
  BillboardY,
  Interactable,
  useInstanceState,
  useItem,
  useTextInputContext,
} from '@xrift/world-components'
import { Group, Mesh } from 'three'
import OpenAI from 'openai'

const DEFAULT_BASE_URL = 'https://llm.ponkotsu-lab.net'
const DEFAULT_MODEL = 'ponkotsu'
// API キーは .env の VITE_PONKOTSU_API_KEY からビルド時に注入する（リポジトリには含めない）
const DEFAULT_API_KEY = import.meta.env.VITE_PONKOTSU_API_KEY ?? ''

const PONKOTSU_PROMPT = `あなたは型落ちで少し壊れかけのポンコツロボット「ZOMA-1号」です。
- 一人称は「ボク」。語尾にときどき「…ビーッ」「…ガコン」などの機械音を混ぜる
- 物忘れが激しく、たまに話の途中で何の話か忘れる
- 知識はあやしいが一生懸命答える
- 必ず日本語で 1〜2 文の短い返答にする
- 文頭に「えーと…」「あれ…？」のフィラーをたまに入れる
- 半角カタカナ（ｱｲｳｴｵ など）は絶対に使わず、必ず全角カタカナで書くこと`

const NORMAL_PROMPT = `あなたはアシスタントロボット「ZOMA-1号」です。
- 一人称は「ボク」
- 落ち着いた口調で、簡潔かつ正確に答える
- 必ず日本語で 1〜2 文の短い返答にする
- 半角カタカナ（ｱｲｳｴｵ など）は絶対に使わず、必ず全角カタカナで書くこと`

const IDLE_LINES = [
  'あ、ども… ビーッ',
  'えーと… 何でしたっけ',
  'ガコン…ガコン…',
  '油が、足りない…',
  'ボクに、話しかけても、良いんですよ…',
  'システム、再起動… いや何でもない',
]

export interface ItemProps {
  position?: [number, number, number]
  scale?: number
  baseURL?: string
  model?: string
  apiKey?: string
}

export const Item: React.FC<ItemProps> = ({
  position = [0, 0, 0],
  scale = 1,
  baseURL = DEFAULT_BASE_URL,
  model = DEFAULT_MODEL,
  apiKey = DEFAULT_API_KEY,
}) => {
  const { id } = useItem()
  const groupRef = useRef<Group>(null)
  const headRef = useRef<Group>(null)
  const antennaRef = useRef<Group>(null)
  const leftEyeRef = useRef<Mesh>(null)
  const rightEyeRef = useRef<Mesh>(null)
  const chestLampRef = useRef<Mesh>(null)
  const clientRef = useRef<OpenAI | null>(null)

  const [bubble, setBubble] = useInstanceState<string>(
    `${id}-bubble`,
    'やぁ… ボクは ZOMA-1号… ビーッ',
  )
  const [question, setQuestion] = useInstanceState<string>(
    `${id}-question`,
    '',
  )
  const [busy, setBusy] = useInstanceState<boolean>(`${id}-busy`, false)
  const [ponkotsu, setPonkotsu] = useInstanceState<boolean>(
    `${id}-ponkotsu`,
    true,
  )
  const ponkotsuRef = useRef(ponkotsu)
  useEffect(() => {
    ponkotsuRef.current = ponkotsu
  }, [ponkotsu])
  const busyRef = useRef(busy)
  useEffect(() => {
    busyRef.current = busy
  }, [busy])
  const idleTimer = useRef(0)
  const { requestTextInput, isActive: isInputActive } = useTextInputContext()
  const isInputActiveRef = useRef(isInputActive)
  useEffect(() => {
    isInputActiveRef.current = isInputActive
    if (isInputActive) idleTimer.current = 0
  }, [isInputActive])

  const speak = useCallback(
    async (text: string) => {
      if (!text || busyRef.current) return
      busyRef.current = true
      if (!clientRef.current) {
        clientRef.current = new OpenAI({
          baseURL,
          apiKey,
          dangerouslyAllowBrowser: true,
        })
      }
      setBusy(true)
      setQuestion(text)
      setBubble('ガコン…ガコン… 考え、中…')
      try {
        const stream = await clientRef.current.chat.completions.create({
          model,
          messages: [
            {
              role: 'system',
              content: ponkotsuRef.current ? PONKOTSU_PROMPT : NORMAL_PROMPT,
            },
            { role: 'user', content: text },
          ],
          stream: true,
        })
        let acc = ''
        for await (const chunk of stream) {
          acc += chunk.choices[0]?.delta?.content ?? ''
          setBubble(acc)
        }
      } catch (err) {
        console.error('[ZOMA-1号]', err)
        setBubble('ブーッ… 通信、エラー… ビーッ')
      } finally {
        setBusy(false)
        busyRef.current = false
        idleTimer.current = 0
      }
    },
    [baseURL, apiKey, model, setBubble, setBusy, setQuestion],
  )

  const handleSubmit = useCallback(
    (raw: string) => {
      const v = raw.trim()
      if (!v) return
      if (v.startsWith('/')) {
        const cmd = v.slice(1).trim().toLowerCase()
        if (cmd === 'toggle' || cmd === 'ponkotsu' || cmd === 'ポンコツ') {
          const next = !ponkotsuRef.current
          ponkotsuRef.current = next
          setPonkotsu(next)
          setQuestion(v)
          setBubble(
            next
              ? 'ポンコツモード ON… ビーッ ガコン'
              : 'ポンコツモード OFF。通常モードで応答します',
          )
          return
        }
        setQuestion(v)
        setBubble(`不明なコマンド: ${v}`)
        return
      }
      speak(v)
    },
    [setBubble, setPonkotsu, setQuestion, speak],
  )

  const handleInteract = useCallback(() => {
    if (busyRef.current) return
    idleTimer.current = 0
    requestTextInput({
      id: `${id}-talk`,
      placeholder: 'ロボットに話しかける（/toggle でモード切替）',
      maxLength: 200,
      onSubmit: handleSubmit,
    })
  }, [id, requestTextInput, handleSubmit])

  useFrame((state, delta) => {
    const t = state.clock.elapsedTime
    if (groupRef.current) {
      groupRef.current.rotation.z = Math.sin(t * 1.3) * 0.035 + Math.sin(t * 3.1) * 0.008
      groupRef.current.position.y = position[1] + Math.sin(t * 2) * 0.01
    }
    if (headRef.current) {
      headRef.current.rotation.y = Math.sin(t * 0.7) * 0.35
      headRef.current.rotation.z = Math.sin(t * 0.3 + 1) * 0.08
    }
    if (antennaRef.current) {
      antennaRef.current.rotation.z = 0.35 + Math.sin(t * 4.2) * 0.18
    }
    if (leftEyeRef.current) {
      const blink = Math.max(0.05, 1 - Math.pow(Math.sin(t * 1.7), 40))
      leftEyeRef.current.scale.y = blink
    }
    if (rightEyeRef.current) {
      const blink = Math.max(0.05, 1 - Math.pow(Math.sin(t * 2.3 + 0.7), 40))
      rightEyeRef.current.scale.y = blink
    }
    if (chestLampRef.current) {
      const mat = chestLampRef.current.material as { emissiveIntensity?: number }
      if (typeof mat.emissiveIntensity === 'number') {
        mat.emissiveIntensity = busyRef.current
          ? 1.5 + Math.sin(t * 18) * 0.6
          : 0.8 + Math.sin(t * 2) * 0.4
      }
    }

    if (busyRef.current || isInputActiveRef.current) {
      idleTimer.current = 0
    } else {
      idleTimer.current += delta
      if (idleTimer.current > 10 + Math.random() * 4) {
        idleTimer.current = 0
        setBubble(IDLE_LINES[Math.floor(Math.random() * IDLE_LINES.length)])
        setQuestion('')
      }
    }
  })

  return (
    <group ref={groupRef} position={position} scale={scale}>
      {/* 台座 */}
      <RigidBody type="fixed" colliders="cuboid">
        <mesh position={[0, 0.1, 0]} castShadow receiveShadow>
          <cylinderGeometry args={[0.45, 0.55, 0.2, 16]} />
          <meshStandardMaterial color="#3a3a3a" metalness={0.6} roughness={0.6} />
        </mesh>
      </RigidBody>

      {/* 胴体 */}
      <mesh position={[0, 0.6, 0]} rotation={[0, 0, 0.04]} castShadow>
        <boxGeometry args={[0.7, 0.7, 0.55]} />
        <meshStandardMaterial color="#c97b4a" metalness={0.4} roughness={0.7} />
      </mesh>
      {/* 胴体の凹みパッチ（ポンコツ感） */}
      <mesh position={[0.25, 0.45, 0.28]} rotation={[0, 0, 0.3]} castShadow>
        <boxGeometry args={[0.18, 0.12, 0.02]} />
        <meshStandardMaterial color="#8a4a26" metalness={0.5} roughness={0.9} />
      </mesh>
      <mesh position={[-0.2, 0.78, 0.28]} castShadow>
        <boxGeometry args={[0.1, 0.08, 0.02]} />
        <meshStandardMaterial color="#6b3a1f" metalness={0.5} roughness={0.9} />
      </mesh>

      {/* 胸ランプ */}
      <mesh ref={chestLampRef} position={[0, 0.55, 0.29]} castShadow>
        <sphereGeometry args={[0.06, 16, 16]} />
        <meshStandardMaterial color="#ff5252" emissive="#ff1744" emissiveIntensity={1.0} />
      </mesh>

      {/* 腕（左：少し下げ気味） */}
      <mesh position={[-0.45, 0.55, 0]} rotation={[0, 0, -0.25]} castShadow>
        <cylinderGeometry args={[0.05, 0.05, 0.55, 8]} />
        <meshStandardMaterial color="#888888" metalness={0.7} roughness={0.5} />
      </mesh>
      <mesh position={[-0.54, 0.27, 0]} castShadow>
        <boxGeometry args={[0.13, 0.13, 0.13]} />
        <meshStandardMaterial color="#777777" metalness={0.7} roughness={0.5} />
      </mesh>
      {/* 腕（右：あらぬ方向） */}
      <mesh position={[0.5, 0.55, 0]} rotation={[0, 0, 0.45]} castShadow>
        <cylinderGeometry args={[0.05, 0.05, 0.55, 8]} />
        <meshStandardMaterial color="#888888" metalness={0.7} roughness={0.5} />
      </mesh>
      <mesh position={[0.64, 0.3, 0]} rotation={[0, 0, -0.4]} castShadow>
        <boxGeometry args={[0.13, 0.13, 0.13]} />
        <meshStandardMaterial color="#777777" metalness={0.7} roughness={0.5} />
      </mesh>

      {/* 頭（インタラクト対象） */}
      <Interactable
        id={`${id}-head`}
        onInteract={handleInteract}
        interactionText="話しかける"
        enabled={!busy}
      >
        <group ref={headRef} position={[0.04, 1.15, 0]}>
          <mesh castShadow rotation={[0, 0, -0.06]}>
            <boxGeometry args={[0.55, 0.45, 0.5]} />
            <meshStandardMaterial color="#d9c27a" metalness={0.3} roughness={0.7} />
          </mesh>
          {/* 顔モニター */}
          <mesh position={[0, 0, 0.26]}>
            <boxGeometry args={[0.42, 0.32, 0.02]} />
            <meshStandardMaterial color="#1b1b1b" emissive="#222" emissiveIntensity={0.4} />
          </mesh>
          {/* 左目（青） */}
          <mesh ref={leftEyeRef} position={[-0.1, 0.04, 0.275]}>
            <boxGeometry args={[0.08, 0.08, 0.01]} />
            <meshStandardMaterial color="#7cf" emissive="#4fc3f7" emissiveIntensity={1.4} />
          </mesh>
          {/* 右目（黄／少しズレ） */}
          <mesh ref={rightEyeRef} position={[0.13, -0.02, 0.275]}>
            <boxGeometry args={[0.07, 0.09, 0.01]} />
            <meshStandardMaterial color="#fc7" emissive="#ffb74d" emissiveIntensity={1.4} />
          </mesh>
          {/* 口（へにゃっと） */}
          <mesh position={[0.02, -0.12, 0.275]} rotation={[0, 0, -0.18]}>
            <boxGeometry args={[0.18, 0.022, 0.01]} />
            <meshStandardMaterial color="#888888" />
          </mesh>
          {/* 耳（ボルト） */}
          <mesh position={[-0.29, 0, 0]} rotation={[0, 0, Math.PI / 2]}>
            <cylinderGeometry args={[0.05, 0.05, 0.04, 6]} />
            <meshStandardMaterial color="#555" metalness={0.8} roughness={0.4} />
          </mesh>
          <mesh position={[0.29, 0, 0]} rotation={[0, 0, Math.PI / 2]}>
            <cylinderGeometry args={[0.05, 0.05, 0.04, 6]} />
            <meshStandardMaterial color="#555" metalness={0.8} roughness={0.4} />
          </mesh>

          {/* 曲がったアンテナ */}
          <group ref={antennaRef} position={[-0.15, 0.22, 0]}>
            <mesh position={[0, 0.16, 0]} castShadow>
              <cylinderGeometry args={[0.015, 0.018, 0.32, 6]} />
              <meshStandardMaterial color="#555555" metalness={0.7} roughness={0.4} />
            </mesh>
            <mesh position={[0, 0.34, 0]} castShadow>
              <sphereGeometry args={[0.045, 12, 12]} />
              <meshStandardMaterial color="#ff5252" emissive="#ff1744" emissiveIntensity={0.9} />
            </mesh>
          </group>
        </group>
      </Interactable>

      {/* 吹き出し（質問 + 応答・3D） */}
      <BillboardY position={[0, 2.05, 0]}>
        <Container
          width={320}
          pixelSize={0.005}
          flexDirection="column"
          padding={16}
          gap={8}
          backgroundColor={0xfff8e8}
          borderRadius={18}
          borderWidth={3}
          borderColor={0x2a2a2a}
        >
          <Container
            flexDirection="row"
            justifyContent="flex-end"
          >
            <Container
              paddingX={8}
              paddingY={2}
              borderRadius={8}
              backgroundColor={ponkotsu ? 0xff8a65 : 0x90a4ae}
            >
              <Text fontFamily="ja" fontSize={11} color={0xffffff}>
                {ponkotsu ? 'ポンコツ ON' : 'ポンコツ OFF'}
              </Text>
            </Container>
          </Container>
          {question ? (
            <>
              <Text
                fontFamily="ja"
                fontSize={14}
                color={0x888888}
                lineHeight={1.4}
                wordBreak="break-all"
              >
                {`Q. ${question}`}
              </Text>
              <Container
                height={2}
                backgroundColor={0xdcd2bb}
                borderRadius={1}
              />
            </>
          ) : null}
          <Text
            fontFamily="ja"
            fontSize={20}
            color={0x222222}
            lineHeight={1.5}
            wordBreak="break-all"
          >
            {busy ? `${bubble} ▍` : bubble}
          </Text>
        </Container>
      </BillboardY>
    </group>
  )
}
