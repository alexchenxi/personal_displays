import { LoadingOutlined } from "@ant-design/icons"
import { Spin } from "antd"
export default function GlobalLoading() {
  return (
    <Spin
      tip="Loading..."
      size="large"
      indicator={<LoadingOutlined spin />}
      fullscreen={true}
    ></Spin>
  )
}
