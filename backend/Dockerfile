# 使用 Node.js 20 LTS 轻量版镜像
FROM node:20-alpine

# 设置工作目录
WORKDIR /app

# 复制 package.json 和 package-lock.json（如果有）
COPY backend/package*.json ./

# 安装生产依赖（不安装 devDependencies，减小镜像体积）
RUN npm ci --only=production

# 复制后端源代码
COPY backend/ ./

# 暴露后端端口（应与 server.js 中监听的端口一致，默认 4000）
EXPOSE 4000

# 启动命令（需与 package.json 中的 start 脚本匹配）
CMD ["npm", "start"]