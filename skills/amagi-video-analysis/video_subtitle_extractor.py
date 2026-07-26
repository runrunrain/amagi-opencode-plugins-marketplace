# -*- coding: utf-8 -*-
"""
视频字幕提取工具 v2.0
支持B站、YouTube等平台的字幕提取和音频转写

使用方法：
    python video_subtitle_extractor.py <video_url> [--cookie <cookie_path>] [--whisper]

示例：
    # B站视频（使用Cookie）
    python video_subtitle_extractor.py "https://www.bilibili.com/video/BV1xxx" --cookie "path/to/private-cookies.txt"

    # YouTube视频
    python video_subtitle_extractor.py "https://www.youtube.com/watch?v=xxx"

    # 无字幕视频（使用Whisper转写）
    python video_subtitle_extractor.py "https://www.bilibili.com/video/BV1xxx" --whisper
"""

import subprocess
import os
import re
import argparse
import glob
from pathlib import Path
from typing import Optional, Dict, List
import tempfile
import shutil


class VideoSubtitleExtractor:
    """视频字幕提取器"""

    def __init__(self, cookie_path: str = None, use_whisper: bool = False, whisper_model: str = "base"):
        self.cookie_path = cookie_path
        self.use_whisper = use_whisper
        self.whisper_model = whisper_model
        self.temp_dir = None

    def _create_temp_dir(self) -> str:
        """创建临时目录"""
        self.temp_dir = tempfile.mkdtemp(prefix="video_subtitle_")
        return self.temp_dir

    def _cleanup(self):
        """清理临时文件"""
        if self.temp_dir and os.path.exists(self.temp_dir):
            shutil.rmtree(self.temp_dir, ignore_errors=True)

    def list_subtitles(self, video_url: str) -> List[str]:
        """列出可用字幕

        Args:
            video_url: 视频链接

        Returns:
            字幕语言列表
        """
        try:
            cmd = [sys.executable, "-m", "yt_dlp", "--list-subs", video_url]

            if self.cookie_path and os.path.exists(self.cookie_path):
                cmd.extend(["--cookies", self.cookie_path])

            result = subprocess.run(
                cmd,
                capture_output=True,
                text=True,
                encoding='utf-8',
                errors='replace'
            )

            # 解析字幕列表
            subtitles = []
            for line in result.stdout.split('\n'):
                if 'ai-zh' in line:
                    subtitles.append('ai-zh')
                elif 'ai-en' in line and 'ai-en' not in subtitles:
                    subtitles.append('ai-en')
                elif 'zh-CN' in line or 'zh-Hans' in line:
                    lang = 'zh-CN' if 'zh-CN' in line else 'zh-Hans'
                    if lang not in subtitles:
                        subtitles.append(lang)

            return subtitles

        except Exception as e:
            print(f"获取字幕列表失败: {e}")
            return []

    def extract_subtitle(self, video_url: str) -> Optional[str]:
        """提取字幕内容

        Args:
            video_url: 视频链接

        Returns:
            字幕纯文本内容，失败返回None
        """
        import sys

        try:
            # 创建临时目录
            temp_dir = self._create_temp_dir()
            output_template = os.path.join(temp_dir, "subtitle")

            # 构建yt-dlp命令
            cmd = [
                sys.executable, "-m", "yt_dlp",
                "--write-subs",
                "--write-auto-subs",
                "--sub-langs", "ai-zh,zh-Hans,zh-CN,zh,en",
                "--skip-download",
                "-o", output_template,
                video_url
            ]

            if self.cookie_path and os.path.exists(self.cookie_path):
                cmd.extend(["--cookies", self.cookie_path])

            print("正在提取字幕...")
            result = subprocess.run(
                cmd,
                capture_output=True,
                text=True,
                encoding='utf-8',
                errors='replace'
            )

            # 查找生成的字幕文件
            srt_files = glob.glob(os.path.join(temp_dir, "*.srt"))
            vtt_files = glob.glob(os.path.join(temp_dir, "*.vtt"))

            subtitle_file = None
            if srt_files:
                # 优先使用ai-zh字幕
                for f in srt_files:
                    if 'ai-zh' in f:
                        subtitle_file = f
                        break
                if not subtitle_file:
                    subtitle_file = srt_files[0]
            elif vtt_files:
                subtitle_file = vtt_files[0]

            if subtitle_file:
                content = self._parse_subtitle(subtitle_file)
                print(f"字幕提取成功，共{len(content)}字符")
                return content

            print("未找到字幕文件")
            return None

        except Exception as e:
            print(f"字幕提取失败: {e}")
            return None

    def _parse_subtitle(self, file_path: str) -> str:
        """解析字幕文件（SRT或VTT）"""
        with open(file_path, 'r', encoding='utf-8', errors='replace') as f:
            content = f.read()

        lines = content.split('\n')
        text_lines = []

        for line in lines:
            # 跳过时间戳行 (SRT和VTT格式)
            if re.match(r'\d{2}:\d{2}:\d{2}[,\.]\d{3}\s*-->', line):
                continue
            # 跳过序号行
            if line.strip().isdigit():
                continue
            # 跳过VTT头部
            if line.strip().startswith('WEBVTT') or line.strip().startswith('Kind:'):
                continue
            if line.strip().startswith('Language:') or line.strip().startswith('NOTE'):
                continue
            # 收集文本行
            if line.strip() and not line.startswith('['):
                # 移除HTML标签
                clean_line = re.sub(r'<[^>]+>', '', line.strip())
                if clean_line:
                    text_lines.append(clean_line)

        return '\n'.join(text_lines)

    def transcribe_audio(self, video_url: str) -> Optional[str]:
        """使用Whisper转写音频"""
        try:
            import whisper
        except ImportError:
            print("错误: 请先安装Whisper: pip install openai-whisper")
            return None

        try:
            # 下载音频
            temp_dir = self._create_temp_dir()
            audio_path = os.path.join(temp_dir, "audio")

            cmd = [
                "python", "-m", "yt_dlp",
                "-x",
                "--audio-format", "mp3",
                "-o", audio_path,
                video_url
            ]

            if self.cookie_path and os.path.exists(self.cookie_path):
                cmd.extend(["--cookies", self.cookie_path])

            print("正在下载音频...")
            subprocess.run(cmd, capture_output=True)

            # 查找音频文件
            audio_file = None
            for ext in ['.mp3', '.m4a', '.webm']:
                candidate = audio_path + ext
                if os.path.exists(candidate):
                    audio_file = candidate
                    break

            if not audio_file:
                print("音频下载失败")
                return None

            # 转写音频
            print(f"正在加载Whisper模型: {self.whisper_model}")
            model = whisper.load_model(self.whisper_model)

            print("开始转写音频...")
            result = model.transcribe(
                audio_file,
                language='zh',
                initial_prompt='这是一个关于AI和人工智能技术的视频'
            )

            print(f"音频转写成功，共{len(result['text'])}字符")
            return result['text']

        except Exception as e:
            print(f"音频转写失败: {e}")
            return None

    def extract(self, video_url: str) -> Optional[str]:
        """提取视频字幕/转写内容

        优先级：平台字幕 > 音频转写

        Args:
            video_url: 视频链接

        Returns:
            字幕/转写文本
        """
        # 1. 尝试获取平台字幕
        content = self.extract_subtitle(video_url)

        if content:
            return content

        # 2. 无字幕时使用Whisper（如果启用）
        if self.use_whisper:
            print("无可用字幕，切换到Whisper转写...")
            content = self.transcribe_audio(video_url)
            return content

        return None


def main():
    import sys

    parser = argparse.ArgumentParser(
        description='视频字幕提取工具',
        formatter_class=argparse.RawDescriptionHelpFormatter,
        epilog="""
示例:
  %(prog)s "https://www.bilibili.com/video/BV1xxx" --cookie "path/to/private-cookies.txt"
  %(prog)s "https://www.youtube.com/watch?v=xxx"
  %(prog)s "https://www.bilibili.com/video/BV1xxx" --whisper --whisper-model medium
        """
    )
    parser.add_argument('url', help='视频链接')
    parser.add_argument('--cookie', '-c', help='私有Cookie文件路径；不要放入插件仓库或提交到Git')
    parser.add_argument('--whisper', '-w', action='store_true', help='启用Whisper转写（无字幕时）')
    parser.add_argument('--whisper-model', default='base',
                       choices=['tiny', 'base', 'small', 'medium', 'large'],
                       help='Whisper模型大小（默认base）')
    parser.add_argument('--output', '-o', help='输出文件路径')
    parser.add_argument('--no-cleanup', action='store_true', help='不清理临时文件')

    args = parser.parse_args()

    # 创建提取器
    extractor = VideoSubtitleExtractor(
        cookie_path=args.cookie,
        use_whisper=args.whisper,
        whisper_model=args.whisper_model
    )

    try:
        # 提取字幕
        content = extractor.extract(args.url)

        if content:
            # 输出结果
            if args.output:
                Path(args.output).write_text(content, encoding='utf-8')
                print(f"已保存到: {args.output}")
            else:
                print("\n" + "="*50)
                print("提取内容:")
                print("="*50)
                print(content[:5000])  # 只显示前5000字符
                if len(content) > 5000:
                    print(f"\n... (共{len(content)}字符，已截断)")
        else:
            print("未能提取到内容")
            return 1

    finally:
        # 清理临时文件
        if not args.no_cleanup:
            extractor._cleanup()

    return 0


if __name__ == "__main__":
    import sys
    exit(main())
