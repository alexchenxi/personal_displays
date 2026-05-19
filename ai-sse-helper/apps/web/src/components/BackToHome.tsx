"use client"

import Link from "next/link"
import { Button } from "antd"
import { HomeOutlined } from "@ant-design/icons"

interface BackToHomeProps {
  label?: string
}

export default function BackToHome({ label = "回到首页" }: BackToHomeProps) {
  return (
    <div style={{ position: "fixed", bottom: 24, right: 24, zIndex: 1000 }}>
      <Link href="/">
        <Button
          type="default"
          icon={<HomeOutlined />}
          size="large"
          className="shadow-lg transition-all duration-300 hover:shadow-xl"
          style={{ borderRadius: 8, height: 44 }}
        >
          {label}
        </Button>
      </Link>
    </div>
  )
}