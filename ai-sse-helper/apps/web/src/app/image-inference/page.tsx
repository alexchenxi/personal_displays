"use client" // 标记为客户端组件，因为需要使用 DOM 操作和 onnxruntime-web
import EfficientNetPage from "@/app/image-inference/efficientNetLite4"

export default function Home() {
  return (
    <div className="min-h-screen bg-gray-100 p-8">
      <EfficientNetPage />
    </div>
  )
}
