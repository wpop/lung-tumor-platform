import { useEffect, useRef } from 'react'
import '@kitware/vtk.js/Rendering/Profiles/Geometry'
import vtkActor from '@kitware/vtk.js/Rendering/Core/Actor'
import vtkMapper from '@kitware/vtk.js/Rendering/Core/Mapper'
import vtkCubeSource from '@kitware/vtk.js/Filters/Sources/CubeSource'
import vtkFullScreenRenderWindow from '@kitware/vtk.js/Rendering/Misc/FullScreenRenderWindow'

function VTKViewer() {
  const containerRef = useRef<HTMLDivElement | null>(null)

  useEffect(() => {
    if (!containerRef.current) {
      return undefined
    }

    // Keep the VTK render window inside this panel instead of the whole page.
    const fullScreenRenderer = vtkFullScreenRenderWindow.newInstance({
      background: [0.08, 0.12, 0.18],
      container: containerRef.current,
      containerStyle: {
        height: '100%',
        position: 'relative',
        width: '100%',
      },
    })

    const renderer = fullScreenRenderer.getRenderer()
    const renderWindow = fullScreenRenderer.getRenderWindow()

    // Render a simple cube while volume rendering is introduced later.
    const cubeSource = vtkCubeSource.newInstance({
      xLength: 1.4,
      yLength: 1.4,
      zLength: 1.4,
    })
    const mapper = vtkMapper.newInstance()
    const actor = vtkActor.newInstance()

    mapper.setInputConnection(cubeSource.getOutputPort())
    actor.setMapper(mapper)
    actor.getProperty().setColor(0.18, 0.55, 0.92)
    actor.getProperty().setEdgeVisibility(true)
    actor.getProperty().setEdgeColor(0.9, 0.96, 1)

    renderer.addActor(actor)
    renderer.resetCamera()
    renderWindow.render()

    return () => {
      // Release VTK resources when React removes this component.
      fullScreenRenderer.delete()
      actor.delete()
      mapper.delete()
      cubeSource.delete()
    }
  }, [])

  return <div className="vtk-viewer-canvas" ref={containerRef} />
}

export default VTKViewer
