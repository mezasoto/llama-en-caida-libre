import { useEffect, useRef, useState } from 'react'
import * as THREE from 'three'
import { OrbitControls } from 'three/addons/controls/OrbitControls.js'

type FlameSceneProps = {
  gravityG: number
  oxygenPercent: number
}

type SceneParameters = {
  gravityG: number
  oxygenPercent: number
}

const particleCount = 128

function createParticleGeometry() {
  const geometry = new THREE.BufferGeometry()
  geometry.setAttribute('position', new THREE.BufferAttribute(new Float32Array(particleCount * 3), 3))
  return geometry
}

export function FlameScene({ gravityG, oxygenPercent }: FlameSceneProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const parametersRef = useRef<SceneParameters>({ gravityG, oxygenPercent })
  const [unavailable, setUnavailable] = useState(false)

  parametersRef.current = { gravityG, oxygenPercent }

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return

    let renderer: THREE.WebGLRenderer
    try {
      renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: false })
    } catch {
      setUnavailable(true)
      return
    }

    setUnavailable(false)
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2))
    renderer.outputColorSpace = THREE.SRGBColorSpace

    const scene = new THREE.Scene()
    scene.background = new THREE.Color('#0d1718')
    const camera = new THREE.PerspectiveCamera(36, 1, 0.1, 50)
    camera.position.set(3.5, 2.2, 5.2)

    const controls = new OrbitControls(camera, renderer.domElement)
    controls.enableDamping = true
    controls.dampingFactor = 0.06
    controls.minDistance = 3.4
    controls.maxDistance = 9
    controls.target.set(0, 0.05, 0)
    controls.autoRotate = true
    controls.autoRotateSpeed = 0.45

    scene.add(new THREE.HemisphereLight('#d5f1ee', '#101518', 2.0))
    const keyLight = new THREE.PointLight('#ffb26f', 18, 10)
    keyLight.position.set(-2, 2, 3)
    scene.add(keyLight)
    const rimLight = new THREE.PointLight('#52b9d6', 12, 10)
    rimLight.position.set(2, 1, -2)
    scene.add(rimLight)

    const chamber = new THREE.Group()
    scene.add(chamber)
    const chamberGeometry = new THREE.EdgesGeometry(new THREE.BoxGeometry(3.3, 3.5, 3.3))
    const chamberLines = new THREE.LineSegments(
      chamberGeometry,
      new THREE.LineBasicMaterial({ color: '#345258', transparent: true, opacity: 0.48 }),
    )
    chamberLines.position.y = 0.05
    chamber.add(chamberLines)

    const floor = new THREE.GridHelper(3.3, 12, '#315157', '#1d353a')
    floor.position.y = -1.7
    const floorMaterials = Array.isArray(floor.material) ? floor.material : [floor.material]
    floorMaterials.forEach((material) => {
      material.transparent = true
      material.opacity = 0.34
    })
    chamber.add(floor)

    const outerFlameMaterial = new THREE.MeshBasicMaterial({
      color: '#58bce2',
      transparent: true,
      opacity: 0.34,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
    })
    const innerFlameMaterial = new THREE.MeshBasicMaterial({
      color: '#ff9d50',
      transparent: true,
      opacity: 0.72,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
    })

    const flameGeometry = new THREE.SphereGeometry(1, 48, 32)
    const outerFlame = new THREE.Mesh(flameGeometry, outerFlameMaterial)
    const innerFlame = new THREE.Mesh(new THREE.SphereGeometry(1, 40, 28), innerFlameMaterial)
    chamber.add(outerFlame, innerFlame)

    const droplet = new THREE.Mesh(
      new THREE.SphereGeometry(0.17, 32, 24),
      new THREE.MeshPhysicalMaterial({
        color: '#d9ddd0',
        metalness: 0.16,
        roughness: 0.2,
        clearcoat: 0.85,
        clearcoatRoughness: 0.12,
      }),
    )
    droplet.position.y = -0.05
    chamber.add(droplet)

    const particleGeometry = createParticleGeometry()
    const particleMaterial = new THREE.PointsMaterial({
      color: '#d6f2f4',
      size: 0.035,
      transparent: true,
      opacity: 0.9,
      sizeAttenuation: true,
    })
    const particles = new THREE.Points(particleGeometry, particleMaterial)
    chamber.add(particles)

    const animationStartedAt = performance.now()
    let animationFrame = 0

    const resizeObserver = new ResizeObserver(() => {
      const { width, height } = canvas.getBoundingClientRect()
      if (width < 1 || height < 1) return
      renderer.setSize(width, height, false)
      camera.aspect = width / height
      camera.updateProjectionMatrix()
    })
    resizeObserver.observe(canvas)

    const animate = () => {
      animationFrame = window.requestAnimationFrame(animate)
      const time = (performance.now() - animationStartedAt) / 1000
      const current = parametersRef.current
      const g = THREE.MathUtils.clamp(current.gravityG, 0, 1)
      const oxygenFactor = THREE.MathUtils.clamp((current.oxygenPercent - 8) / 22, 0.18, 1)
      const pulse = 1 + Math.sin(time * 3.2) * 0.025
      const width = (0.88 - g * 0.3) * (0.88 + oxygenFactor * 0.12) * pulse
      const height = (0.82 + g * 0.9) * (0.88 + oxygenFactor * 0.12) * pulse

      outerFlame.scale.set(width * 1.12, height * 1.05, width * 1.12)
      innerFlame.scale.set(width * 0.68, height * 0.65, width * 0.68)
      outerFlame.position.y = -0.05 + g * 0.2
      innerFlame.position.copy(outerFlame.position)
      outerFlameMaterial.opacity = 0.18 + oxygenFactor * 0.22
      innerFlameMaterial.opacity = 0.34 + oxygenFactor * 0.42
      keyLight.intensity = 8 + oxygenFactor * 14
      chamber.rotation.y = Math.sin(time * 0.22) * 0.035

      const positions = particleGeometry.attributes.position as THREE.BufferAttribute
      for (let index = 0; index < particleCount; index += 1) {
        const progress = (time * 0.12 + index / particleCount) % 1
        const angle = index * 2.399963229728653
        const radius = 0.24 + progress * (0.38 + (1 - g) * 0.72)
        const rise = progress * (0.2 + g * 1.42)
        const oscillation = Math.sin(time * 1.7 + angle) * (0.07 + (1 - g) * 0.13)
        positions.setXYZ(
          index,
          Math.cos(angle) * radius * (1 - g * 0.35),
          -0.04 + rise + oscillation,
          Math.sin(angle) * radius * (1 - g * 0.35),
        )
      }
      positions.needsUpdate = true

      controls.update()
      renderer.render(scene, camera)
    }

    animate()

    return () => {
      window.cancelAnimationFrame(animationFrame)
      resizeObserver.disconnect()
      controls.dispose()
      chamber.traverse((object) => {
        if (object instanceof THREE.Mesh || object instanceof THREE.LineSegments || object instanceof THREE.Points) {
          object.geometry.dispose()
          const materials = Array.isArray(object.material) ? object.material : [object.material]
          materials.forEach((material) => material.dispose())
        }
      })
      renderer.dispose()
    }
  }, [])

  if (unavailable) {
    return <div className="flame-scene-fallback">WebGL no está disponible en este navegador.</div>
  }

  return <canvas ref={canvasRef} className="flame-scene-canvas" aria-label="Simulación conceptual 3D de una gota de combustible ardiendo en microgravedad" />
}