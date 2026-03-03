#!/usr/bin/env node
/**
 * OpenClaw 版本检测脚本
 * 用于确定当前 OpenClaw 版本支持的扩展机制
 */

const fs = require('fs');
const path = require('path');

console.log('🔍 OpenClaw 版本检测\n');

// 1. 检查 OpenClaw 版本
console.log('1. OpenClaw 版本:');
try {
  const openclawPath = require.resolve('openclaw/package.json');
  const openclawPkg = require(openclawPath);
  console.log(`   版本: ${openclawPkg.version}`);
  console.log(`   路径: ${path.dirname(openclawPath)}`);
} catch (e) {
  console.log('   ❌ 无法获取版本信息');
}

// 2. 检查配置文件
console.log('\n2. 配置文件:');
const configPaths = [
  path.join(process.env.HOME || process.env.USERPROFILE, '.openclaw/openclaw.json'),
  path.join(process.env.HOME || process.env.USERPROFILE, '.openclaw/config.yaml'),
];

for (const configPath of configPaths) {
  if (fs.existsSync(configPath)) {
    console.log(`   ✅ 找到: ${configPath}`);
    try {
      const content = fs.readFileSync(configPath, 'utf8');
      const config = JSON.parse(content);
      console.log(`   配置键: ${Object.keys(config).join(', ')}`);
    } catch {
      console.log(`   无法解析配置`);
    }
  }
}

// 3. 检查 OpenClaw 源码结构
console.log('\n3. OpenClaw 源码结构:');
try {
  const openclawRoot = path.dirname(require.resolve('openclaw'));
  const files = fs.readdirSync(openclawRoot);
  console.log(`   根目录文件: ${files.slice(0, 10).join(', ')}`);

  // 查找 dist/lib 目录
  ['dist', 'lib', 'src'].forEach(dir => {
    const dirPath = path.join(openclawRoot, dir);
    if (fs.existsSync(dirPath)) {
      const subFiles = fs.readdirSync(dirPath).slice(0, 5);
      console.log(`   ${dir}/: ${subFiles.join(', ')}...`);
    }
  });
} catch (e) {
  console.log('   ❌ 无法读取源码结构');
}

// 4. 尝试加载 OpenClaw 模块
console.log('\n4. 模块导出检测:');
try {
  const openclaw = require('openclaw');
  console.log(`   导出类型: ${typeof openclaw}`);
  console.log(`   导出键: ${Object.keys(openclaw).join(', ') || '无'}`);
} catch (e) {
  console.log(`   ❌ 无法加载: ${e.message}`);
}

// 5. 建议
console.log('\n5. 建议:');
console.log('   如果以上信息不足，请运行以下命令查找更多信息:');
console.log('   grep -r "extensions\\|skills\\|agents" $(npm root -g)/openclaw/dist 2>/dev/null | head -10');
