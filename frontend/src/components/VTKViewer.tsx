import { useEffect, useRef } from 'react'
import '@kitware/vtk.js/Rendering/Profiles/Volume'
import vtkDataArray from '@kitware/vtk.js/Common/Core/DataArray'
import vtkImageData from '@kitware/vtk.js/Common/DataModel/ImageData'
import vtkPiecewiseFunction from '@kitware/vtk.js/Common/DataModel/PiecewiseFunction'
import vtkColorTransferFunction from '@kitware/vtk.js/Rendering/Core/ColorTransferFunction'
import vtkFullScreenRenderWindow from '@kitware/vtk.js/Rendering/Misc/FullScreenRenderWindow'
import vtkVolume from '@kitware/vtk.js/Rendering/Core/Volume'
import vtkVolumeMapper from '@kitware/vtk.js/Rendering/Core/VolumeMapper'

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

    // Build a small synthetic volume with a soft sphere in the center.
    const dimension = 64
    const center = (dimension - 1) / 2
    const radius = dimension * 0.28
    const scalars = new Uint8Array(dimension * dimension * dimension)

    for (let z = 0; z < dimension; z += 1) {
      for (let y = 0; y < dimension; y += 1) {
        for (let x = 0; x < dimension; x += 1) {
          const dx = x - center
          const dy = y - center
          const dz = z - center
          const distance = Math.sqrt(dx * dx + dy * dy + dz * dz)
          const index = x + y * dimension + z * dimension * dimension

          if (distance <= radius) {
            const normalizedDistance = distance / radius
            scalars[index] = Math.round(255 * (1 - normalizedDistance ** 2))
          }
        }
      }
    }

    const imageData = vtkImageData.newInstance()
    imageData.setDimensions(dimension, dimension, dimension)
    imageData.setSpacing([1, 1, 1])
    imageData.setOrigin([-center, -center, -center])
    const scalarArray = vtkDataArray.newInstance({
      name: 'Synthetic sphere',
      numberOfComponents: 1,
      values: scalars,
    })
    imageData.getPointData().setScalars(scalarArray)

    // Map scalar values to color and opacity for volume rendering.
    const colorTransferFunction = vtkColorTransferFunction.newInstance()
    colorTransferFunction.addRGBPoint(0, 0.02, 0.04, 0.08)
    colorTransferFunction.addRGBPoint(90, 0.18, 0.5, 0.95)
    colorTransferFunction.addRGBPoint(255, 0.95, 0.96, 1)

    const opacityTransferFunction = vtkPiecewiseFunction.newInstance()
    opacityTransferFunction.addPoint(0, 0)
    opacityTransferFunction.addPoint(60, 0.02)
    opacityTransferFunction.addPoint(140, 0.18)
    opacityTransferFunction.addPoint(255, 0.55)

    const mapper = vtkVolumeMapper.newInstance()
    mapper.setInputData(imageData)
    mapper.setSampleDistance(0.7)

    const volume = vtkVolume.newInstance()
    volume.setMapper(mapper)
    volume.getProperty().setRGBTransferFunction(0, colorTransferFunction)
    volume.getProperty().setScalarOpacity(0, opacityTransferFunction)
    volume.getProperty().setScalarOpacityUnitDistance(0, 2.5)
    volume.getProperty().setInterpolationTypeToFastLinear()

    renderer.addVolume(volume)
    renderer.resetCamera()
    renderWindow.render()

    return () => {
      // Release VTK resources when React removes this component.
      fullScreenRenderer.delete()
      volume.delete()
      mapper.delete()
      imageData.delete()
      scalarArray.delete()
      colorTransferFunction.delete()
      opacityTransferFunction.delete()
    }
  }, [])

  return <div className="vtk-viewer-canvas" ref={containerRef} />
}

export default VTKViewer
