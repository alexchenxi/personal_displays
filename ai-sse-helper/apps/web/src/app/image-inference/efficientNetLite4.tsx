"use client"

import { useState, useRef, useEffect } from "react"
import * as ort from "onnxruntime-web"
import { Card, Button, Typography, Row, Col, Tag, Upload, Spin } from "antd"
import {
  UploadOutlined,
  FileImageTwoTone,
  CheckCircleOutlined,
} from "@ant-design/icons"
import BackToHome from "@/components/BackToHome"

const { Title, Paragraph } = Typography

type Prediction = {
  label: string
  confidence: number
}

const EfficientNetPage = () => {
  const [image, setImage] = useState<File | null>(null)
  const [previewUrl, setPreviewUrl] = useState<string | null>(null)
  const [predictions, setPredictions] = useState<Prediction[]>([])
  const [loading, setLoading] = useState(false)
  const [model, setModel] = useState<ort.InferenceSession | null>(null)
  const [labels, setLabels] = useState<string[]>([])
  const [modelLoading, setModelLoading] = useState(true)
  const fileInputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    const loadResources = async () => {
      try {
        const labelResponse = await fetch(
          "/resources/models/efficientnet_lite4_labels.json",
        )
        const labelData = await labelResponse.json()
        setLabels(labelData)

        const session = await ort.InferenceSession.create(
          "/resources/models/efficientnet-lite4-11-int8.onnx",
          {
            executionProviders: ["webgl", "cpu"],
            graphOptimizationLevel: "all",
          },
        )
        setModel(session)
        console.log("模型和标签加载成功")
      } catch (error) {
        console.error("加载模型/标签失败：", error)
        alert("模型初始化失败，请检查文件路径")
      } finally {
        setModelLoading(false)
      }
    }

    loadResources()
  }, [])

  useEffect(() => {
    if (!image) return
    const reader = new FileReader()
    reader.onload = (e) => {
      setPreviewUrl(e.target?.result as string)
    }
    reader.readAsDataURL(image)
    return () => setPreviewUrl(null)
  }, [image])

  const preprocessImage = async (
    imgElement: HTMLImageElement,
  ): Promise<ort.Tensor> => {
    const canvas = document.createElement("canvas")
    const ctx = canvas.getContext("2d")
    if (!ctx) throw new Error("获取 Canvas 上下文失败")

    const targetSize = 224
    canvas.width = targetSize
    canvas.height = targetSize

    const { width, height } = imgElement
    const shorterSide = Math.min(width, height)
    const x = (width - shorterSide) / 2
    const y = (height - shorterSide) / 2
    ctx.drawImage(
      imgElement,
      x,
      y,
      shorterSide,
      shorterSide,
      0,
      0,
      targetSize,
      targetSize,
    )

    const imageData = ctx.getImageData(0, 0, targetSize, targetSize)
    const dataLength = targetSize * targetSize * 3
    const data = new Float32Array(dataLength)

    for (let i = 0; i < targetSize * targetSize; i++) {
      const pixelIndex = i * 4
      const r = (imageData.data[pixelIndex] / 255.0 - 0.485) / 0.229
      const g = (imageData.data[pixelIndex + 1] / 255.0 - 0.456) / 0.224
      const b = (imageData.data[pixelIndex + 2] / 255.0 - 0.406) / 0.225

      data[i * 3] = r
      data[i * 3 + 1] = g
      data[i * 3 + 2] = b
    }

    const tensorShape = [1, targetSize, targetSize, 3]
    return new ort.Tensor("float32", data, tensorShape)
  }

  const runInference = async () => {
    if (!image || !model || labels.length === 0) return

    setLoading(true)
    setPredictions([])

    try {
      const img = new Image()
      img.crossOrigin = "anonymous"
      await new Promise((resolve, reject) => {
        img.onload = resolve
        img.onerror = reject
        img.src = previewUrl as string
      })

      const inputTensor = await preprocessImage(img)
      const inputNames = Array.from(model.inputNames)
      if (inputNames.length === 0) throw new Error("模型无有效输入节点")
      const inputName = inputNames[0]

      const feeds = { [inputName]: inputTensor }
      const results = await model.run(feeds)
      if (!results || Object.keys(results).length === 0) {
        throw new Error("模型推理返回空结果")
      }

      const outputNames = Array.from(model.outputNames)
      if (outputNames.length === 0) throw new Error("模型无有效输出节点")
      const outputName = outputNames[0]

      const outputTensor = results[outputName] as ort.Tensor
      if (!outputTensor) {
        throw new Error(`未获取到输出张量，输出名称：${outputName}`)
      }
      const outputData = outputTensor.data as Float32Array
      if (!outputData) throw new Error("输出张量无有效数据")

      const predictionResults: Prediction[] = Array.from(outputData)
        .map((confidence, index) => ({
          label: labels[index] || `未知分类 ${index}`,
          confidence: parseFloat(confidence.toFixed(4)),
        }))
        .sort((a, b) => b.confidence - a.confidence)
        .slice(0, 5)

      setPredictions(predictionResults)
    } catch (error) {
      console.error("推理失败：", error)
      alert("图片识别失败，请重试")
    } finally {
      setLoading(false)
    }
  }

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file && file.type.startsWith("image/")) {
      setImage(file)
    }
  }

  const triggerFileInput = () => {
    fileInputRef.current?.click()
  }

  return (
    <div className="mx-auto flex max-w-lg flex-1 flex-col px-4 py-8">
      <div className="text-center mb-8">
        <Title
          level={2}
          className="mb-2"
          style={{
            background: "linear-gradient(135deg, #667eea 0%, #764ba2 100%)",
            WebkitBackgroundClip: "text",
            WebkitTextFillColor: "transparent",
          }}
        >
          EfficientNet-Lite4 图片识别
        </Title>
        <Paragraph style={{ color: "#666", marginBottom: 0 }}>
          基于深度学习的图像分类模型，支持 1000 种物体识别
        </Paragraph>
      </div>

      <Card
        hoverable
        className="mb-6 shadow-md"
        styles={{
          body: { padding: 24 },
        }}
      >
        {modelLoading ? (
          <div className="flex flex-col items-center justify-center py-12">
            <Spin size="large" tip="加载模型中..." />
            <p className="mt-4 text-gray-500">请稍候，模型正在初始化</p>
          </div>
        ) : (
          <>
            <div
              className="border-2 border-dashed border-gray-300 rounded-xl p-8 text-center cursor-pointer transition-all hover:border-indigo-400 hover:bg-indigo-50/50"
              onClick={triggerFileInput}
            >
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                onChange={handleFileChange}
                className="hidden"
              />
              {previewUrl ? (
                <div className="relative">
                  <img
                    src={previewUrl}
                    alt="预览"
                    className="max-h-64 mx-auto object-contain rounded-lg"
                  />
                  <div className="mt-4 flex items-center justify-center gap-2 text-green-600">
                    <CheckCircleOutlined />
                    <span>图片已上传</span>
                  </div>
                </div>
              ) : (
                <div className="flex flex-col items-center gap-4">
                  <div className="flex h-20 w-20 items-center justify-center rounded-2xl bg-gradient-to-br from-indigo-500 to-purple-500">
                    <UploadOutlined className="text-white text-3xl" />
                  </div>
                  <div>
                    <p className="font-medium text-gray-700">点击上传图片</p>
                    <p className="text-sm text-gray-500">支持 JPG、PNG 格式</p>
                  </div>
                </div>
              )}
            </div>

            <Button
              type="primary"
              size="large"
              block
              onClick={runInference}
              disabled={!image || loading || !model}
              loading={loading}
              className="mt-6 shadow-md"
              style={{ height: 48, borderRadius: 8 }}
            >
              {loading ? "识别中..." : "开始识别"}
            </Button>
          </>
        )}
      </Card>

      {predictions.length > 0 && (
        <Card
          title={
            <div className="flex items-center gap-2">
              <FileImageTwoTone className="text-indigo-500" />
              <span>识别结果（前5名）</span>
            </div>
          }
          className="shadow-md"
        >
          <div className="space-y-3">
            {predictions.map((pred, index) => (
              <div
                key={index}
                className="flex items-center justify-between p-3 rounded-lg bg-gray-50 hover:bg-gray-100 transition-colors"
              >
                <div className="flex items-center gap-3">
                  <Tag color="indigo">{index + 1}</Tag>
                  <span className="font-medium truncate max-w-[200px]">
                    {pred.label}
                  </span>
                </div>
                <span
                  className={`font-bold ${
                    pred.confidence > 0.7
                      ? "text-green-600"
                      : pred.confidence > 0.4
                        ? "text-yellow-600"
                        : "text-red-600"
                  }`}
                >
                  {(pred.confidence * 100).toFixed(2)}%
                </span>
              </div>
            ))}
          </div>
        </Card>
      )}

      <BackToHome />
    </div>
  )
}

export default EfficientNetPage
