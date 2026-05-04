/**
 * 開発環境用エントリーポイント
 *
 * ローカル開発時（npm run dev）に使用されます。
 * 本番ビルド（npm run build）では使用されません。
 */

import { StrictMode, useMemo } from 'react'
import { createRoot } from 'react-dom/client'
import { Canvas } from '@react-three/fiber'
import { Physics } from '@react-three/rapier'
import { OrbitControls } from '@react-three/drei'
import {
  ItemProvider,
  TextInputProvider,
  createDefaultTextInputImplementation,
} from '@xrift/world-components'
import { Item } from './Item'

const rootElement = document.getElementById('root')
if (!rootElement) throw new Error('Root element not found')

const App = () => {
  const textInput = useMemo(() => createDefaultTextInputImplementation(), [])
  return (
    <div style={{ width: '100vw', height: '100vh' }}>
      <Canvas shadows camera={{ position: [3, 3, 3], fov: 50 }}>
        <TextInputProvider value={textInput}>
          <Physics>
            <ambientLight intensity={0.4} />
            <directionalLight
              position={[5, 5, 5]}
              intensity={1}
              castShadow
            />
            <ItemProvider id="zoma-robot-dev-a">
              <Item position={[-1.2, 0, 0]} />
            </ItemProvider>
            <ItemProvider id="zoma-robot-dev-b">
              <Item position={[1.2, 0, 0]} />
            </ItemProvider>
            {/* 地面 */}
            <mesh receiveShadow rotation={[-Math.PI / 2, 0, 0]} position={[0, 0, 0]}>
              <planeGeometry args={[10, 10]} />
              <meshStandardMaterial color="#888888" />
            </mesh>
            <OrbitControls />
          </Physics>
        </TextInputProvider>
      </Canvas>
    </div>
  )
}

createRoot(rootElement).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
