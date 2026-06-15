import { useEffect, useRef } from 'react'
import '@kitware/vtk.js/Rendering/Profiles/Volume'
import vtkDataArray from '@kitware/vtk.js/Common/Core/DataArray'
import vtkImageData from '@kitware/vtk.js/Common/DataModel/ImageData'
import vtkPiecewiseFunction from '@kitware/vtk.js/Common/DataModel/PiecewiseFunction'
import vtkColorTransferFunction from '@kitware/vtk.js/Rendering/Core/ColorTransferFunction'
import vtkFullScreenRenderWindow from '@kitware/vtk.js/Rendering/Misc/FullScreenRenderWindow'
import vtkVolume from '@kitware/vtk.js/Rendering/Core/Volume'
import vtkVolumeMapper from '@kitware/vtk.js/Rendering/Core/VolumeMapper'
import { getVolumeData, type VolumeDataResponse } from '../api/client'

type VTKViewerProps = {
  caseId?: string
}

type VolumePayload = {
  dimensions: [number, number, number]
  spacing: [number, number, number]
  scalars: Uint8Array
}

type VTKObject = {
  delete: () => void
}

function createSyntheticVolume(): VolumePayload {
  const dimension = 64
  const center = (dimension - 1) / 2
  const radius = dimension * 0.28
  const scalars = new Uint8Array(dimension * dimension * dimension)

  // Build a small synthetic volume with a soft sphere in the center.
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

  return {
    dimensions: [dimension, dimension, dimension],
    spacing: [1, 1, 1],
    scalars,
  }
}

function toVolumePayload(volumeData: VolumeDataResponse): VolumePayload {
  return {
    dimensions: volumeData.dimensions,
    spacing: volumeData.spacing,
    scalars: Uint8Array.from(volumeData.scalars),
  }
}

function VTKViewer({ caseId }: VTKViewerProps) {
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
    const vtkObjects: VTKObject[] = []
    let isCancelled = false

    function renderVolume(payload: VolumePayload) {
      const [xSize, ySize, zSize] = payload.dimensions
      const center = [
        (xSize - 1) / 2,
        (ySize - 1) / 2,
        (zSize - 1) / 2,
      ] as const

      const imageData = vtkImageData.newInstance()
      imageData.setDimensions(payload.dimensions)
      imageData.setSpacing(payload.spacing)
      imageData.setOrigin([-center[0], -center[1], -center[2]])

      const scalarArray = vtkDataArray.newInstance({
        name: caseId ? 'CT volume' : 'Synthetic sphere',
        numberOfComponents: 1,
        values: payload.scalars,
      })
      imageData.getPointData().setScalars(scalarArray)

      // Map normalized CT values to color and opacity for volume rendering.
      const colorTransferFunction = vtkColorTransferFunction.newInstance()
      colorTransferFunction.addRGBPoint(0, 0.02, 0.04, 0.08)
      colorTransferFunction.addRGBPoint(70, 0.18, 0.5, 0.95)
      colorTransferFunction.addRGBPoint(160, 0.75, 0.82, 0.9)
      colorTransferFunction.addRGBPoint(255, 1, 0.98, 0.92)

      const opacityTransferFunction = vtkPiecewiseFunction.newInstance()
      opacityTransferFunction.addPoint(0, 0)
      opacityTransferFunction.addPoint(45, 0.01)
      opacityTransferFunction.addPoint(120, 0.08)
      opacityTransferFunction.addPoint(255, 0.42)

      const mapper = vtkVolumeMapper.newInstance()
      mapper.setInputData(imageData)
      mapper.setSampleDistance(0.9)

      const volume = vtkVolume.newInstance()
      volume.setMapper(mapper)
      volume.getProperty().setRGBTransferFunction(0, colorTransferFunction)
      volume.getProperty().setScalarOpacity(0, opacityTransferFunction)
      volume.getProperty().setScalarOpacityUnitDistance(0, 2.5)
      volume.getProperty().setInterpolationTypeToFastLinear()

      vtkObjects.push(
        volume,
        mapper,
        imageData,
        scalarArray,
        colorTransferFunction,
        opacityTransferFunction,
      )

      renderer.addVolume(volume)
      renderer.resetCamera()
      renderWindow.render()
    }

    async function loadAndRenderVolume() {
      if (!caseId) {
        renderVolume(createSyntheticVolume())
        return
      }

      try {
        const volumeData = await getVolumeData(caseId)
        if (!isCancelled) {
          renderVolume(toVolumePayload(volumeData))
        }
      } catch (error) {
        // Keep the panel useful if real CT data cannot be loaded yet.
        console.error(error)
        if (!isCancelled) {
          renderVolume(createSyntheticVolume())
        }
      }
    }

    void loadAndRenderVolume()

    return () => {
      // Release VTK resources when React removes this component.
      isCancelled = true
      vtkObjects.forEach((vtkObject) => vtkObject.delete())
      fullScreenRenderer.delete()
    }
  }, [caseId])

  return <div className="vtk-viewer-canvas" ref={containerRef} />
}

export default VTKViewer
