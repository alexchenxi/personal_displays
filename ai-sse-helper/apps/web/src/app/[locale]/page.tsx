"use client"

import { Card, Button, Typography, Space, Row, Col, Tag } from "antd"
import {
  RocketOutlined,
  CreditCardOutlined,
  ThunderboltOutlined,
  GlobalOutlined,
  SafetyOutlined,
  ArrowRightOutlined,
} from "@ant-design/icons"
import { useTranslations } from "next-intl"
import { Link, usePathname } from "@/i18n/routing"

const { Title, Paragraph } = Typography

const features = [
  {
    key: "streaming",
    icon: <ThunderboltOutlined className="text-3xl text-indigo-500" />,
    titleKey: "home.features.streaming.title",
    descKey: "home.features.streaming.desc",
    gradient: "from-indigo-500 to-purple-500",
  },
  {
    key: "multilingual",
    icon: <GlobalOutlined className="text-3xl text-green-500" />,
    titleKey: "home.features.multilingual.title",
    descKey: "home.features.multilingual.desc",
    gradient: "from-green-500 to-emerald-500",
  },
  {
    key: "payment",
    icon: <SafetyOutlined className="text-3xl text-blue-500" />,
    titleKey: "home.features.payment.title",
    descKey: "home.features.payment.desc",
    gradient: "from-blue-500 to-cyan-500",
  },
]

export default function HomePage() {
  const t = useTranslations()
  const pathname = usePathname()

  return (
    <div className="mx-auto flex max-w-5xl flex-1 flex-col px-4 py-8">
      {/* Hero Section */}
      <div className="mb-12 text-center">
        <Title
          level={1}
          className="mb-4"
          style={{
            background: "linear-gradient(135deg, #667eea 0%, #764ba2 100%)",
            WebkitBackgroundClip: "text",
            WebkitTextFillColor: "transparent",
            fontSize: "clamp(2rem, 5vw, 3rem)",
          }}
        >
          {t("home.hero.title")}
        </Title>
        <Paragraph
          className="mx-auto mb-8 max-w-2xl text-base"
          style={{ color: "#666" }}
        >
          {t("home.hero.subtitle")}
        </Paragraph>
        <Space size={16} wrap>
          <Link href="/ai-helper">
            <Button
              type="primary"
              size="large"
              icon={<RocketOutlined />}
              className="shadow-lg"
              style={{
                height: 48,
                paddingInline: 32,
                fontSize: 16,
                borderRadius: 8,
              }}
            >
              {t("home.hero.startChat")}
            </Button>
          </Link>
          <Link href="/stripe-ui">
            <Button
              size="large"
              icon={<CreditCardOutlined />}
              className="shadow-lg"
              style={{
                height: 48,
                paddingInline: 32,
                fontSize: 16,
                borderRadius: 8,
              }}
            >
              {t("home.hero.tryPayment")}
            </Button>
          </Link>
        </Space>
      </div>

      {/* Feature Cards */}
      <Row gutter={[24, 24]} className="mb-12">
        {features.map((f) => (
          <Col xs={24} md={8} key={f.key}>
            <Card
              hoverable
              className="h-full shadow-md transition-all hover:-translate-y-1 hover:shadow-lg"
              styles={{
                body: {
                  padding: 32,
                  display: "flex",
                  flexDirection: "column",
                  alignItems: "center",
                  textAlign: "center",
                  height: "100%",
                },
              }}
            >
              <div
                className={`mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-br ${f.gradient}`}
                style={{ padding: 16 }}
              >
                {f.icon}
              </div>
              <Title level={4} style={{ marginBottom: 8 }}>
                {t(f.titleKey)}
              </Title>
              <Paragraph style={{ color: "#666", marginBottom: 0, flex: 1 }}>
                {t(f.descKey)}
              </Paragraph>
            </Card>
          </Col>
        ))}
      </Row>

      {/* Quick Navigation */}
      <div className="mb-8">
        <Title level={3} className="mb-6 text-center">
          {t("home.nav.title")}
        </Title>
        <Row gutter={[24, 24]}>
          <Col xs={24} md={12}>
            <Link href="/ai-helper">
              <Card
                hoverable
                className={`cursor-pointer transition-all hover:-translate-y-1 ${
                  pathname === "/ai-helper" ? "ring-2 ring-indigo-400" : ""
                }`}
              >
                <Row align="middle" gutter={16}>
                  <Col>
                    <div
                      className="flex h-14 w-14 items-center justify-center rounded-xl bg-gradient-to-br from-indigo-500 to-purple-500"
                      style={{ color: "#fff", fontSize: 24 }}
                    >
                      <RocketOutlined />
                    </div>
                  </Col>
                  <Col flex={1}>
                    <Title level={4} style={{ marginBottom: 4 }}>
                      {t("home.nav.aiHelper")}
                    </Title>
                    <Paragraph style={{ marginBottom: 0, color: "#666" }}>
                      {t("home.nav.aiHelperDesc")}
                    </Paragraph>
                  </Col>
                  <Col>
                    <Tag color="indigo" className="flex items-center gap-1">
                      {t("home.nav.visit")} <ArrowRightOutlined />
                    </Tag>
                  </Col>
                </Row>
              </Card>
            </Link>
          </Col>
          <Col xs={24} md={12}>
            <Link href="/stripe-ui">
              <Card
                hoverable
                className={`cursor-pointer transition-all hover:-translate-y-1 ${
                  pathname === "/stripe-ui" ? "ring-2 ring-green-400" : ""
                }`}
              >
                <Row align="middle" gutter={16}>
                  <Col>
                    <div
                      className="flex h-14 w-14 items-center justify-center rounded-xl bg-gradient-to-br from-green-500 to-emerald-500"
                      style={{ color: "#fff", fontSize: 24 }}
                    >
                      <CreditCardOutlined />
                    </div>
                  </Col>
                  <Col flex={1}>
                    <Title level={4} style={{ marginBottom: 4 }}>
                      {t("home.nav.stripeUI")}
                    </Title>
                    <Paragraph style={{ marginBottom: 0, color: "#666" }}>
                      {t("home.nav.stripeUIDesc")}
                    </Paragraph>
                  </Col>
                  <Col>
                    <Tag color="green" className="flex items-center gap-1">
                      {t("home.nav.visit")} <ArrowRightOutlined />
                    </Tag>
                  </Col>
                </Row>
              </Card>
            </Link>
          </Col>
        </Row>
      </div>
    </div>
  )
}
