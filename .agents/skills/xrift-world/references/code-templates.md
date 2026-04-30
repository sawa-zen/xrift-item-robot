# Code Templates

Common implementation patterns for XRift world development.

## Loading a GLB Model

```typescript
import { useXRift } from '@xrift/world-components'
import { useGLTF } from '@react-three/drei'
import { RigidBody } from '@react-three/rapier'

export const MyModel = () => {
  const { baseUrl } = useXRift()
  const { scene } = useGLTF(`${baseUrl}model.glb`)

  return (
    <RigidBody type="fixed">
      <primitive object={scene} castShadow receiveShadow />
    </RigidBody>
  )
}
```

## Loading a Single Texture

```typescript
import { useXRift } from '@xrift/world-components'
import { useTexture } from '@react-three/drei'

export const TexturedMesh = () => {
  const { baseUrl } = useXRift()
  const texture = useTexture(`${baseUrl}albedo.png`)

  return (
    <mesh>
      <boxGeometry args={[1, 1, 1]} />
      <meshStandardMaterial map={texture} />
    </mesh>
  )
}
```

## Multiple Textures (PBR)

```typescript
import { useXRift } from '@xrift/world-components'
import { useTexture } from '@react-three/drei'

export const PBRMaterial = () => {
  const { baseUrl } = useXRift()
  const [albedo, normal, roughness] = useTexture([
    `${baseUrl}albedo.png`,
    `${baseUrl}normal.png`,
    `${baseUrl}roughness.png`,
  ])

  return (
    <meshStandardMaterial
      map={albedo}
      normalMap={normal}
      roughnessMap={roughness}
    />
  )
}
```

## Skybox (360-degree Panorama Background)

```typescript
import { useXRift } from '@xrift/world-components'
import { useTexture } from '@react-three/drei'
import { BackSide } from 'three'

export const Skybox = ({ radius = 500 }) => {
  const { baseUrl } = useXRift()
  const texture = useTexture(`${baseUrl}skybox.jpg`)

  return (
    <mesh>
      <sphereGeometry args={[radius, 60, 40]} />
      <meshBasicMaterial map={texture} side={BackSide} />
    </mesh>
  )
}
```

## Interaction + State Synchronization

```typescript
import { Interactable, useInstanceState } from '@xrift/world-components'

export const InteractiveButton = ({ id }: { id: string }) => {
  // useInstanceState: State synchronized across all users
  const [clickCount, setClickCount] = useInstanceState(`${id}-count`, 0)

  return (
    <Interactable
      id={id}
      onInteract={() => setClickCount((prev) => prev + 1)}
      interactionText={`Click count: ${clickCount}`}
    >
      <mesh>
        <boxGeometry args={[1, 1, 0.2]} />
        <meshStandardMaterial color={clickCount > 0 ? 'green' : 'gray'} />
      </mesh>
    </Interactable>
  )
}
```

## Animation (useFrame)

```typescript
import { useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import type { Mesh } from 'three'

export const RotatingCube = ({ speed = 1 }) => {
  const meshRef = useRef<Mesh>(null)

  useFrame((_, delta) => {
    if (meshRef.current) {
      meshRef.current.rotation.y += delta * speed
    }
  })

  return (
    <mesh ref={meshRef}>
      <boxGeometry args={[1, 1, 1]} />
      <meshStandardMaterial color="hotpink" />
    </mesh>
  )
}
```

## Teleport (Interactable Method)

Click-to-teleport pattern.

```typescript
import { useTeleport, Interactable } from '@xrift/world-components'

export const TeleportButton = () => {
  const { teleport } = useTeleport()
  return (
    <Interactable
      id="tp-button"
      onInteract={() => teleport({ position: [50, 0, 30], yaw: 180 })}
      interactionText="Teleport"
    >
      <mesh>
        <boxGeometry />
        <meshStandardMaterial color="purple" />
      </mesh>
    </Interactable>
  )
}
```

## Teleport (Sensor Method)

Warp zone pattern that teleports on contact.

```typescript
import { useCallback } from 'react'
import { useTeleport } from '@xrift/world-components'
import { RigidBody } from '@react-three/rapier'

export const TeleportZone = () => {
  const { teleport } = useTeleport()
  const handleEnter = useCallback(() => {
    teleport({ position: [0, 0.5, 50], yaw: 0 })
  }, [teleport])

  return (
    <RigidBody type="fixed" sensor onIntersectionEnter={handleEnter}>
      <mesh>
        <cylinderGeometry args={[1.2, 1.2, 1, 32]} />
        <meshBasicMaterial visible={false} />
      </mesh>
    </RigidBody>
  )
}
```

**Note**: When creating warp zones with the sensor method, make sure the teleport destination does not overlap with another portal (this would cause an infinite teleport loop on landing).

## Confirm Before World Navigation

Use `useConfirm` to ask the user for confirmation before navigating to another world. This also avoids iOS Safari's popup blocker by ensuring navigation is triggered from a user gesture.

```typescript
import { useConfirm, Interactable } from '@xrift/world-components'

export const WorldPortal = ({ worldId }: { worldId: string }) => {
  const { requestConfirm } = useConfirm()

  const handleEnter = async () => {
    const ok = await requestConfirm({ message: 'ワールドを移動しますか？' })
    if (ok) {
      window.location.href = `/worlds/${worldId}`
    }
  }

  return (
    <Interactable
      id={`portal-${worldId}`}
      onInteract={handleEnter}
      interactionText="Enter World"
    >
      <mesh>
        <boxGeometry args={[2, 3, 0.2]} />
        <meshStandardMaterial color="cyan" />
      </mesh>
    </Interactable>
  )
}
```

## Portal to Another Instance

Place a portal that lets players navigate to another instance with a confirmation dialog.

```typescript
import { Portal } from '@xrift/world-components'

export const MyWorld = () => {
  return (
    <>
      {/* Portal to a specific instance */}
      <Portal
        instanceId="target-instance-id"
        position={[5, 0, 0]}
      />

      {/* Multiple portals */}
      <Portal
        instanceId="another-instance-id"
        position={[-5, 0, 0]}
        rotation={[0, Math.PI, 0]}
      />
    </>
  )
}
```

## Instance / World Info Display

Use `useInstance` or `useWorld` to fetch and display information about instances or worlds.

```typescript
import { Text } from '@react-three/drei'
import { useInstance, useWorld } from '@xrift/world-components'

export const InstanceInfoBoard = ({ instanceId }: { instanceId: string }) => {
  const { info } = useInstance(instanceId)

  if (!info) return null

  return (
    <group>
      <Text position={[0, 2, 0]} fontSize={0.2} color="white">
        {info.world.name}
      </Text>
      <Text position={[0, 1.7, 0]} fontSize={0.12} color="#cccccc">
        {`${info.currentUsers}/${info.maxCapacity} players`}
      </Text>
    </group>
  )
}

export const WorldInfoBoard = ({ worldId }: { worldId: string }) => {
  const { info } = useWorld(worldId)

  if (!info) return null

  return (
    <Text position={[0, 2, 0]} fontSize={0.2} color="white">
      {info.name}
    </Text>
  )
}
```

## Y-Axis Billboard (BillboardY)

Make objects face the camera on Y-axis only. Useful for flames, particles, name plates, and signage. Works correctly with Mirror (Reflector) — objects display with the correct orientation in reflections.

```typescript
import { Text } from '@react-three/drei'
import { BillboardY } from '@xrift/world-components'

export const SignBoard = () => {
  return (
    <BillboardY position={[0, 2, 0]}>
      <mesh>
        <planeGeometry args={[2, 1]} />
        <meshStandardMaterial color="#333" />
      </mesh>
      <Text position={[0, 0, 0.01]} fontSize={0.2} color="white">
        Hello World
      </Text>
    </BillboardY>
  )
}
```

For InstancedMesh or custom logic, use the `useBillboardY` hook or `getBillboardYRotation` utility:

```typescript
import { useBillboardY, getBillboardYRotation } from '@xrift/world-components'
import type { Mesh } from 'three'

// Hook: auto-rotates the ref target each render pass (Mirror-compatible)
const ref = useBillboardY<Mesh>()
<mesh ref={ref}>...</mesh>

// Utility: manual rotation calculation (e.g. for InstancedMesh)
const rotation = getBillboardYRotation(cameraWorldPos, targetWorldPos)
dummy.rotation.y = rotation
```

## Audio Volume Override (Stage/Podium)

Override specific user's audio volume for stages or podiums.

```typescript
import { useCallback } from 'react'
import { useVoiceVolumeOverride } from '@xrift/world-components'
import { RigidBody } from '@react-three/rapier'

export const StagePodium = () => {
  const { setOverride, clearOverride } = useVoiceVolumeOverride()

  const handleEnter = useCallback(
    (userId: string) => {
      setOverride(userId, 1.0) // Amplify speaker's voice to all
    },
    [setOverride],
  )

  const handleLeave = useCallback(
    (userId: string) => {
      clearOverride(userId)
    },
    [clearOverride],
  )

  return (
    <RigidBody
      type="fixed"
      sensor
      onIntersectionEnter={() => handleEnter('local-user')}
      onIntersectionExit={() => handleLeave('local-user')}
    >
      <mesh>
        <cylinderGeometry args={[1, 1, 0.2, 32]} />
        <meshStandardMaterial color="gold" />
      </mesh>
    </RigidBody>
  )
}
```

## Instance Event (Reaction)

Send and receive custom events across all users in the instance.

```typescript
import { useCallback, useState } from 'react'
import { useInstanceEvent, Interactable } from '@xrift/world-components'

export const ReactionButton = () => {
  const [lastReaction, setLastReaction] = useState('')

  const emitReaction = useInstanceEvent('reaction', (data: { emoji: string }) => {
    setLastReaction(data.emoji)
  })

  const sendReaction = useCallback(
    (emoji: string) => {
      emitReaction({ emoji })
    },
    [emitReaction],
  )

  return (
    <Interactable
      id="reaction-button"
      onInteract={() => sendReaction('👍')}
      interactionText="Send Reaction"
    >
      <mesh>
        <boxGeometry args={[1, 1, 0.2]} />
        <meshStandardMaterial color="yellow" />
      </mesh>
    </Interactable>
  )
}
```

## Instance Event (Join/Leave Detection)

Listen for platform events when users join or leave the instance.

```typescript
import { useInstanceEvent } from '@xrift/world-components'

export const JoinLeaveNotifier = () => {
  useInstanceEvent('user-joined', (data) => {
    console.log('User joined:', data)
  })

  useInstanceEvent('user-left', (data) => {
    console.log('User left:', data)
  })

  return null
}
```

**Note**: Platform events (`user-joined`, `user-left`) are receive-only. The emit function returned by `useInstanceEvent` is a no-op for these events.

## User Position Tracking

```typescript
import { useFrame } from '@react-three/fiber'
import { useUsers } from '@xrift/world-components'

export const UserTracker = () => {
  const { remoteUsers, getMovement, getLocalMovement } = useUsers()

  useFrame(() => {
    // Local player position
    const myMovement = getLocalMovement()
    console.log('My position:', myMovement.position)

    // Remote player positions
    remoteUsers.forEach((user) => {
      const movement = getMovement(user.socketId)
      if (movement) {
        console.log(`${user.displayName}:`, movement.position)
      }
    })
  })

  return null
}
```

## Avatar Height-based HUD Placement

```typescript
import { useFrame } from '@react-three/fiber'
import { useUsers } from '@xrift/world-components'
import { useRef } from 'react'
import { Group } from 'three'
import { Text } from '@react-three/drei'

export const UserNameTag = ({ user, getMovement, getAvatarHeight }) => {
  const groupRef = useRef<Group>(null)

  useFrame(() => {
    const movement = getMovement(user.id)
    if (!movement || !groupRef.current) return

    const avatarHeight = getAvatarHeight?.(user.id)
    const headOffset = (avatarHeight?.height ?? 1.5) + 0.2

    groupRef.current.position.set(
      movement.position.x,
      movement.position.y + headOffset,
      movement.position.z
    )
  })

  return (
    <group ref={groupRef}>
      <Text fontSize={0.15}>{user.displayName}</Text>
    </group>
  )
}
```

**Note**: `getAvatarHeight` is optional. Always use optional chaining (`?.`). Default height is 1.5m if unavailable.

## File Upload with useFileInput

Use `useFileInput` to let users select files from the 3D world. The overlay supports both click-to-browse and drag & drop.

```typescript
import { useFileInput, Interactable } from '@xrift/world-components'
import { useState } from 'react'
import { Text } from '@react-three/drei'

export const FileUploader = () => {
  const { requestFileInput } = useFileInput()
  const [status, setStatus] = useState('Click to upload')

  const handleUpload = () => {
    requestFileInput({
      id: 'image-upload',
      accept: 'image/*',
      maxSize: 10 * 1024 * 1024, // 10MB
      onSelect: (files) => {
        setStatus(`Selected: ${files[0].name}`)
      },
      onCancel: () => {
        setStatus('Cancelled')
      },
      onError: (error) => {
        setStatus(`Error: ${error.message}`)
      },
    })
  }

  return (
    <group>
      <Interactable id="upload-btn" onInteract={handleUpload} interactionText="Upload Image">
        <mesh position={[0, 1, 0]}>
          <boxGeometry args={[1, 0.5, 0.1]} />
          <meshStandardMaterial color="#7b2d8b" />
        </mesh>
      </Interactable>
      <Text position={[0, 1.6, 0]} fontSize={0.12} color="white" anchorX="center">
        {status}
      </Text>
    </group>
  )
}
```

**Note**: If called during a VR session, the session is automatically ended before the file picker opens. The `accept` prop filters files both in the file picker dialog and when using drag & drop.

## Shared File Upload with useSharedFile

Use `useSharedFile` to upload files to the instance's shared storage and retrieve the list of shared files. Combine with `useFileInput` to let users pick a file, then upload it with progress tracking.

```typescript
import { useSharedFile, useFileInput, Interactable } from '@xrift/world-components'
import { useCallback, useState } from 'react'
import { Text } from '@react-three/drei'

export const SharedFileUploader = () => {
  const { uploadSharedFile, getSharedFiles } = useSharedFile()
  const { requestFileInput } = useFileInput()
  const [status, setStatus] = useState('Click to upload')

  const handleUpload = useCallback(() => {
    requestFileInput({
      id: 'shared-upload',
      accept: 'image/*',
      maxSize: 10 * 1024 * 1024,
      onSelect: async (files) => {
        const file = files[0]
        if (!file) return
        setStatus(`Uploading: ${file.name}`)
        try {
          const result = await uploadSharedFile(file, (progress) => {
            setStatus(`Uploading: ${progress}%`)
          })
          setStatus(`Done: ${result.fileName}`)
        } catch (e) {
          setStatus(`Error: ${e instanceof Error ? e.message : String(e)}`)
        }
      },
    })
  }, [requestFileInput, uploadSharedFile])

  const handleList = useCallback(async () => {
    const files = await getSharedFiles()
    setStatus(files.length > 0 ? `${files.length} files` : 'No shared files')
  }, [getSharedFiles])

  return (
    <group>
      <Interactable id="upload-btn" onInteract={handleUpload} interactionText="Upload File">
        <mesh position={[0, 1, 0]}>
          <boxGeometry args={[1, 0.5, 0.1]} />
          <meshStandardMaterial color="#d4a017" />
        </mesh>
      </Interactable>
      <Interactable id="list-btn" onInteract={handleList} interactionText="List Files">
        <mesh position={[1.5, 1, 0]}>
          <boxGeometry args={[1, 0.5, 0.1]} />
          <meshStandardMaterial color="#c47f17" />
        </mesh>
      </Interactable>
      <Text position={[0.75, 1.6, 0]} fontSize={0.12} color="white" anchorX="center" maxWidth={3}>
        {status}
      </Text>
    </group>
  )
}
```

**Note**: `uploadSharedFile` returns a `SharedFileInfo` object containing the `publicUrl` which can be used to display the uploaded file (e.g. as a texture on a 3D surface). The `onProgress` callback receives a percentage value (0-100).
