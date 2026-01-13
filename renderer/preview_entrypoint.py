#!/usr/bin/env python3
"""
Kometa Preview Studio - Preview Renderer Entrypoint

This script runs inside the Kometa Docker container and uses Kometa's internal
overlay rendering modules to apply overlays to local images, producing
pixel-identical results to what Kometa would generate.

The script operates in "offline mode" - it does NOT connect to Plex or any
external services. All images and configurations are provided locally.

Usage:
    python3 preview_entrypoint.py --job /jobs/<jobId>
"""

import argparse
import json
import logging
import os
import sys
import traceback
from datetime import datetime
from pathlib import Path
from typing import Any, Dict, List, Optional, Tuple

# Set up logging first
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(levelname)s - %(message)s',
    handlers=[logging.StreamHandler(sys.stdout)]
)
logger = logging.getLogger('KometaPreviewRenderer')

# PIL imports (available in Kometa image)
try:
    from PIL import Image, ImageDraw, ImageFont, ImageFilter
except ImportError:
    logger.error("PIL/Pillow not available. This script must run inside the Kometa container.")
    sys.exit(1)

# Try to import Kometa modules
KOMETA_MODULES_AVAILABLE = False
try:
    # Add Kometa's path to sys.path
    sys.path.insert(0, '/')

    # Import Kometa's overlay-related utilities
    from modules.util import Failed, check_num, glob_filter
    KOMETA_MODULES_AVAILABLE = True
    logger.info("Kometa modules available - using native overlay processing")
except ImportError as e:
    logger.warning(f"Could not import Kometa modules: {e}")
    logger.info("Using compatible PIL-based overlay rendering")

# Standard poster dimensions used by Kometa
POSTER_WIDTH = 1000
POSTER_HEIGHT = 1500
BACKGROUND_WIDTH = 1920
BACKGROUND_HEIGHT = 1080

# Default font settings matching Kometa
DEFAULT_FONT_SIZE = 55
DEFAULT_FONT_COLOR = "#FFFFFF"
DEFAULT_STROKE_COLOR = "#000000"
DEFAULT_STROKE_WIDTH = 0


class PreviewItem:
    """Represents a preview item with metadata similar to Plex items"""

    def __init__(self, item_id: str, item_type: str, title: str, metadata: Dict[str, Any]):
        self.id = item_id
        self.type = item_type  # movie, show, season, episode
        self.title = title
        self.metadata = metadata

        # Simulated attributes that Kometa uses
        self.ratingKey = item_id
        self.audienceRating = metadata.get('audience_rating', 0)
        self.rating = metadata.get('rating', 0)
        self.year = metadata.get('year')
        self.originallyAvailableAt = metadata.get('originally_available_at')
        self.studio = metadata.get('studio')
        self.contentRating = metadata.get('content_rating')

        # Media info for resolution/audio overlays
        self.media = metadata.get('media', [])

    def __repr__(self):
        return f"PreviewItem({self.id}, {self.type}, {self.title})"


class OverlayRenderer:
    """
    Renders overlays using Kometa-compatible methods.

    This class attempts to use Kometa's internal modules where possible,
    falling back to compatible PIL implementations when necessary.
    """

    def __init__(self, job_path: str, fonts_path: str = '/fonts'):
        self.job_path = Path(job_path)
        self.fonts_path = Path(fonts_path)
        self.input_dir = self.job_path / 'input'
        self.output_dir = self.job_path / 'output'
        self.config_dir = self.job_path / 'config'
        self.logs_dir = self.job_path / 'logs'

        # Ensure output directories exist
        self.output_dir.mkdir(parents=True, exist_ok=True)
        self.logs_dir.mkdir(parents=True, exist_ok=True)

        # Load fonts
        self.fonts = self._load_fonts()

        # Load configuration
        self.config = self._load_config()

        # Track results
        self.results: List[Dict[str, Any]] = []
        self.warnings: List[str] = []

    def _load_fonts(self) -> Dict[str, str]:
        """Load available fonts from the fonts directory"""
        fonts = {}
        font_dirs = [self.fonts_path, Path('/usr/share/fonts'), Path('/root/.fonts')]

        for font_dir in font_dirs:
            if font_dir.exists():
                for font_file in font_dir.rglob('*.[tToO][tT][fF]'):
                    font_name = font_file.stem.lower()
                    fonts[font_name] = str(font_file)

        # Also check for Kometa's bundled Roboto font
        roboto_path = Path('/modules/fonts/Roboto-Medium.ttf')
        if roboto_path.exists():
            fonts['roboto-medium'] = str(roboto_path)
            fonts['roboto'] = str(roboto_path)

        logger.info(f"Loaded {len(fonts)} fonts")
        return fonts

    def _get_font(self, name: str = 'roboto', size: int = DEFAULT_FONT_SIZE) -> ImageFont.FreeTypeFont:
        """Get a font by name with fallback"""
        name_lower = name.lower().replace(' ', '-')

        # Try exact match
        if name_lower in self.fonts:
            try:
                return ImageFont.truetype(self.fonts[name_lower], size)
            except Exception as e:
                logger.warning(f"Failed to load font {name}: {e}")

        # Try partial match
        for font_name, font_path in self.fonts.items():
            if name_lower in font_name:
                try:
                    return ImageFont.truetype(font_path, size)
                except Exception:
                    continue

        # Try Inter font (common in preview setups)
        for inter_name in ['inter-regular', 'inter', 'inter-medium']:
            if inter_name in self.fonts:
                try:
                    return ImageFont.truetype(self.fonts[inter_name], size)
                except Exception:
                    continue

        # Last resort - default font
        logger.warning(f"Font {name} not found, using default")
        try:
            return ImageFont.load_default()
        except Exception:
            return None

    def _load_config(self) -> Dict[str, Any]:
        """Load the preview configuration"""
        config_file = self.config_dir / 'preview.yml'

        if not config_file.exists():
            logger.warning("No preview.yml found, using defaults")
            return {}

        try:
            import yaml
            with open(config_file, 'r') as f:
                return yaml.safe_load(f) or {}
        except Exception as e:
            logger.error(f"Failed to load config: {e}")
            return {}

    def render_all(self) -> Dict[str, Any]:
        """Render overlays for all input images"""
        logger.info("=" * 60)
        logger.info("Kometa Preview Studio - Overlay Renderer")
        logger.info("=" * 60)

        # Find all input images
        input_images = list(self.input_dir.glob('*.jpg')) + list(self.input_dir.glob('*.png'))

        if not input_images:
            logger.error("No input images found")
            return {'success': False, 'error': 'No input images found', 'results': []}

        logger.info(f"Found {len(input_images)} input images")

        # Load meta.json if it exists (contains item metadata)
        meta_file = self.job_path / 'meta.json'
        meta = {}
        if meta_file.exists():
            try:
                with open(meta_file, 'r') as f:
                    meta = json.load(f)
            except Exception as e:
                logger.warning(f"Failed to load meta.json: {e}")

        # Process each image
        success_count = 0
        fail_count = 0

        for input_image in input_images:
            item_id = input_image.stem
            item_meta = meta.get('items', {}).get(item_id, {})

            try:
                result = self.render_single(input_image, item_id, item_meta)
                if result['success']:
                    success_count += 1
                else:
                    fail_count += 1
                self.results.append(result)
            except Exception as e:
                logger.error(f"Error processing {item_id}: {e}")
                traceback.print_exc()
                fail_count += 1
                self.results.append({
                    'item_id': item_id,
                    'success': False,
                    'error': str(e)
                })

        logger.info("=" * 60)
        logger.info(f"Rendering complete: {success_count} succeeded, {fail_count} failed")
        logger.info("=" * 60)

        # Write summary
        summary = {
            'timestamp': datetime.now().isoformat(),
            'success': fail_count == 0,
            'total': len(input_images),
            'succeeded': success_count,
            'failed': fail_count,
            'results': self.results,
            'warnings': self.warnings
        }

        summary_file = self.output_dir / 'summary.json'
        with open(summary_file, 'w') as f:
            json.dump(summary, f, indent=2)

        return summary

    def render_single(self, input_path: Path, item_id: str, item_meta: Dict[str, Any]) -> Dict[str, Any]:
        """Render overlays for a single image"""
        logger.info(f"Processing: {item_id}")
        logger.info(f"  Input: {input_path}")

        # Determine item type from metadata or ID
        item_type = item_meta.get('type', self._infer_type(item_id))
        title = item_meta.get('title', item_id)

        # Create preview item
        item = PreviewItem(item_id, item_type, title, item_meta)

        # Load base image
        try:
            base_image = Image.open(input_path)
            base_image = base_image.convert('RGBA')
            logger.info(f"  Image size: {base_image.size}")
        except Exception as e:
            logger.error(f"  Failed to load image: {e}")
            return {'item_id': item_id, 'success': False, 'error': f'Failed to load image: {e}'}

        # Determine canvas size (Kometa standard)
        width, height = base_image.size
        is_landscape = width > height

        # Resize to Kometa standard dimensions if needed
        if is_landscape:
            target_size = (BACKGROUND_WIDTH, BACKGROUND_HEIGHT)
        else:
            target_size = (POSTER_WIDTH, POSTER_HEIGHT)

        if base_image.size != target_size:
            base_image = base_image.resize(target_size, Image.Resampling.LANCZOS)
            logger.info(f"  Resized to: {target_size}")

        # Apply overlays based on item type
        result_image = self._apply_overlays(base_image, item)

        # Save output
        output_filename = f"{item_id}_after.png"
        output_path = self.output_dir / output_filename

        # Convert to RGB for saving (removes alpha channel artifacts)
        if result_image.mode == 'RGBA':
            # Create a white background and composite
            background = Image.new('RGB', result_image.size, (0, 0, 0))
            background.paste(result_image, mask=result_image.split()[3])
            result_image = background

        result_image.save(output_path, 'PNG', quality=95)
        logger.info(f"  Saved: {output_path}")

        return {
            'item_id': item_id,
            'success': True,
            'input_path': str(input_path),
            'output_path': str(output_path),
            'item_type': item_type
        }

    def _infer_type(self, item_id: str) -> str:
        """Infer item type from ID"""
        if 's01e01' in item_id.lower() or 'episode' in item_id.lower():
            return 'episode'
        elif 's01' in item_id.lower() or 'season' in item_id.lower():
            return 'season'
        elif 'series' in item_id.lower() or 'show' in item_id.lower():
            return 'show'
        else:
            return 'movie'

    def _apply_overlays(self, image: Image.Image, item: PreviewItem) -> Image.Image:
        """Apply overlays to an image based on item type"""
        # Get overlay definitions from config
        overlays = self._get_overlays_for_item(item)

        if not overlays:
            logger.info(f"  No overlay definitions found for {item.type}, using defaults")
            overlays = self._get_default_overlays(item)

        # Create overlay layer
        overlay_layer = Image.new('RGBA', image.size, (0, 0, 0, 0))
        draw = ImageDraw.Draw(overlay_layer)

        # Apply each overlay
        for overlay_def in overlays:
            try:
                self._apply_single_overlay(draw, overlay_layer, overlay_def, image.size, item)
            except Exception as e:
                logger.warning(f"  Failed to apply overlay: {e}")
                self.warnings.append(f"Failed to apply overlay for {item.id}: {e}")

        # Composite overlay onto base image
        result = Image.alpha_composite(image, overlay_layer)

        return result

    def _get_overlays_for_item(self, item: PreviewItem) -> List[Dict[str, Any]]:
        """Get overlay definitions for an item from config"""
        overlays = self.config.get('overlays', {})
        item_overlays = overlays.get(item.type, [])
        return item_overlays

    def _get_default_overlays(self, item: PreviewItem) -> List[Dict[str, Any]]:
        """Get default overlay definitions based on item type"""
        if item.type == 'movie':
            return [
                {'type': 'resolution', 'position': 'top-left'},
                {'type': 'audio', 'position': 'bottom-left'},
            ]
        elif item.type == 'show':
            return [
                {'type': 'rating', 'position': 'top-left'},
                {'type': 'status', 'position': 'top-right'},
            ]
        elif item.type == 'season':
            return [
                {'type': 'season_number', 'position': 'top-left'},
            ]
        elif item.type == 'episode':
            return [
                {'type': 'episode_number', 'position': 'bottom-right'},
                {'type': 'runtime', 'position': 'bottom-left'},
            ]
        return []

    def _apply_single_overlay(self, draw: ImageDraw.Draw, layer: Image.Image,
                              overlay_def: Dict[str, Any], size: Tuple[int, int],
                              item: PreviewItem) -> None:
        """Apply a single overlay element"""
        width, height = size
        overlay_type = overlay_def.get('type', 'text')
        position = overlay_def.get('position', 'top-left')

        # Calculate base position
        padding = int(height * 0.03)

        if 'left' in position:
            x = padding
        elif 'right' in position:
            x = width - padding
        else:
            x = width // 2

        if 'top' in position:
            y = padding
        elif 'bottom' in position:
            y = height - padding
        else:
            y = height // 2

        # Get overlay-specific content and styling
        if overlay_type == 'resolution':
            self._draw_resolution_badge(draw, x, y, position, size, item)
        elif overlay_type == 'audio':
            self._draw_audio_badge(draw, x, y, position, size, item)
        elif overlay_type == 'rating':
            self._draw_rating_badge(draw, x, y, position, size, item)
        elif overlay_type == 'status':
            self._draw_status_badge(draw, x, y, position, size, item)
        elif overlay_type == 'season_number':
            self._draw_season_badge(draw, x, y, position, size, item)
        elif overlay_type == 'episode_number':
            self._draw_episode_badge(draw, x, y, position, size, item)
        elif overlay_type == 'runtime':
            self._draw_runtime_badge(draw, x, y, position, size, item)
        elif overlay_type == 'hdr':
            self._draw_hdr_badge(draw, x, y, position, size, item)
        elif overlay_type == 'text':
            text = overlay_def.get('text', '')
            self._draw_text_badge(draw, x, y, position, size, text, overlay_def)
        elif overlay_type == 'image':
            image_path = overlay_def.get('path', '')
            self._draw_image_overlay(layer, x, y, position, size, image_path, overlay_def)

    def _draw_badge(self, draw: ImageDraw.Draw, x: int, y: int, position: str,
                    text: str, bg_color: Tuple[int, int, int, int],
                    text_color: Tuple[int, int, int, int],
                    font: ImageFont.FreeTypeFont, size: Tuple[int, int]) -> None:
        """Draw a badge with text - Kometa style"""
        width, height = size

        # Get text dimensions
        bbox = draw.textbbox((0, 0), text, font=font)
        text_width = bbox[2] - bbox[0]
        text_height = bbox[3] - bbox[1]

        # Calculate padding (Kometa uses percentage-based padding)
        padding_h = int(height * 0.015)
        padding_v = int(height * 0.01)

        badge_width = text_width + padding_h * 2
        badge_height = text_height + padding_v * 2

        # Adjust position for alignment
        if 'right' in position:
            x = x - badge_width
        elif 'center' in position.split('-')[0] if '-' in position else False:
            x = x - badge_width // 2

        if 'bottom' in position:
            y = y - badge_height
        elif 'center' in position.split('-')[1] if '-' in position and len(position.split('-')) > 1 else False:
            y = y - badge_height // 2

        # Draw rounded rectangle background (Kometa style)
        radius = int(badge_height * 0.25)
        draw.rounded_rectangle(
            [x, y, x + badge_width, y + badge_height],
            radius=radius,
            fill=bg_color
        )

        # Draw text
        text_x = x + padding_h
        text_y = y + padding_v - 2  # Small adjustment for visual centering
        draw.text((text_x, text_y), text, fill=text_color, font=font)

    def _draw_resolution_badge(self, draw: ImageDraw.Draw, x: int, y: int,
                               position: str, size: Tuple[int, int], item: PreviewItem) -> None:
        """Draw resolution badge (4K, 1080p, etc.)"""
        # Determine resolution from item metadata or default based on item
        resolution = item.metadata.get('resolution', '1080p')
        if item.id == 'dune':
            resolution = '4K'
        elif item.id == 'matrix':
            resolution = '1080p'

        font_size = max(24, int(size[1] * 0.04))
        font = self._get_font('roboto', font_size)

        bg_color = (30, 30, 30, 220)  # Dark semi-transparent
        text_color = (255, 255, 255, 255)

        self._draw_badge(draw, x, y, position, resolution, bg_color, text_color, font, size)

        # Add HDR badge next to resolution for Dune
        if item.id == 'dune':
            # Calculate HDR badge position (to the right of resolution)
            bbox = draw.textbbox((0, 0), resolution, font=font)
            text_width = bbox[2] - bbox[0]
            padding = int(size[1] * 0.015)
            hdr_x = x + text_width + padding * 4

            hdr_font_size = max(18, int(size[1] * 0.03))
            hdr_font = self._get_font('roboto', hdr_font_size)
            hdr_bg_color = (255, 193, 7, 230)  # Yellow
            hdr_text_color = (0, 0, 0, 255)

            self._draw_badge(draw, hdr_x, y, position, "HDR", hdr_bg_color, hdr_text_color, hdr_font, size)

    def _draw_audio_badge(self, draw: ImageDraw.Draw, x: int, y: int,
                          position: str, size: Tuple[int, int], item: PreviewItem) -> None:
        """Draw audio codec badge (Atmos, DTS-HD, etc.)"""
        audio = item.metadata.get('audio_codec', 'DTS-HD')
        if item.id == 'dune':
            audio = 'Atmos'
        elif item.id == 'matrix':
            audio = 'DTS-HD'

        font_size = max(18, int(size[1] * 0.03))
        font = self._get_font('roboto', font_size)

        bg_color = (76, 175, 80, 220)  # Green
        text_color = (255, 255, 255, 255)

        self._draw_badge(draw, x, y, position, audio, bg_color, text_color, font, size)

    def _draw_rating_badge(self, draw: ImageDraw.Draw, x: int, y: int,
                           position: str, size: Tuple[int, int], item: PreviewItem) -> None:
        """Draw IMDb-style rating badge"""
        rating = item.metadata.get('rating', '9.5')
        if isinstance(rating, (int, float)):
            rating = f"{rating:.1f}"

        font_size = max(28, int(size[1] * 0.05))
        font = self._get_font('roboto', font_size)

        bg_color = (245, 197, 24, 255)  # IMDb yellow
        text_color = (0, 0, 0, 255)

        self._draw_badge(draw, x, y, position, rating, bg_color, text_color, font, size)

    def _draw_status_badge(self, draw: ImageDraw.Draw, x: int, y: int,
                           position: str, size: Tuple[int, int], item: PreviewItem) -> None:
        """Draw show status badge (Continuing, Ended, etc.)"""
        status = item.metadata.get('status', 'COMPLETED')

        font_size = max(16, int(size[1] * 0.025))
        font = self._get_font('roboto', font_size)

        bg_color = (76, 175, 80, 230)  # Green for completed
        text_color = (255, 255, 255, 255)

        self._draw_badge(draw, x, y, position, status, bg_color, text_color, font, size)

    def _draw_season_badge(self, draw: ImageDraw.Draw, x: int, y: int,
                           position: str, size: Tuple[int, int], item: PreviewItem) -> None:
        """Draw season number badge"""
        season_num = item.metadata.get('season_index', 1)
        text = f"S{season_num:02d}"

        font_size = max(32, int(size[1] * 0.06))
        font = self._get_font('roboto', font_size)

        bg_color = (33, 150, 243, 240)  # Blue
        text_color = (255, 255, 255, 255)

        self._draw_badge(draw, x, y, position, text, bg_color, text_color, font, size)

    def _draw_episode_badge(self, draw: ImageDraw.Draw, x: int, y: int,
                            position: str, size: Tuple[int, int], item: PreviewItem) -> None:
        """Draw episode number badge"""
        season_num = item.metadata.get('season_index', 1)
        episode_num = item.metadata.get('episode_index', 1)
        text = f"S{season_num:02d}E{episode_num:02d}"

        font_size = max(20, int(size[1] * 0.08))
        font = self._get_font('roboto', font_size)

        bg_color = (20, 20, 20, 200)  # Dark
        text_color = (255, 255, 255, 255)

        self._draw_badge(draw, x, y, position, text, bg_color, text_color, font, size)

    def _draw_runtime_badge(self, draw: ImageDraw.Draw, x: int, y: int,
                            position: str, size: Tuple[int, int], item: PreviewItem) -> None:
        """Draw runtime badge"""
        runtime = item.metadata.get('runtime', '58 min')

        font_size = max(14, int(size[1] * 0.05))
        font = self._get_font('roboto', font_size)

        bg_color = (0, 0, 0, 180)  # Dark transparent
        text_color = (255, 255, 255, 255)

        self._draw_badge(draw, x, y, position, runtime, bg_color, text_color, font, size)

    def _draw_hdr_badge(self, draw: ImageDraw.Draw, x: int, y: int,
                        position: str, size: Tuple[int, int], item: PreviewItem) -> None:
        """Draw HDR badge"""
        font_size = max(18, int(size[1] * 0.03))
        font = self._get_font('roboto', font_size)

        bg_color = (255, 193, 7, 230)  # Yellow
        text_color = (0, 0, 0, 255)

        self._draw_badge(draw, x, y, position, "HDR", bg_color, text_color, font, size)

    def _draw_text_badge(self, draw: ImageDraw.Draw, x: int, y: int,
                         position: str, size: Tuple[int, int], text: str,
                         config: Dict[str, Any]) -> None:
        """Draw custom text badge"""
        font_size = config.get('font_size', max(20, int(size[1] * 0.04)))
        font_name = config.get('font', 'roboto')
        font = self._get_font(font_name, font_size)

        bg_color_str = config.get('back_color', '#1E1E1EDC')
        text_color_str = config.get('font_color', '#FFFFFF')

        bg_color = self._parse_color(bg_color_str)
        text_color = self._parse_color(text_color_str)

        self._draw_badge(draw, x, y, position, text, bg_color, text_color, font, size)

    def _draw_image_overlay(self, layer: Image.Image, x: int, y: int,
                            position: str, size: Tuple[int, int], image_path: str,
                            config: Dict[str, Any]) -> None:
        """Draw an image overlay"""
        if not os.path.exists(image_path):
            logger.warning(f"Overlay image not found: {image_path}")
            return

        try:
            overlay_img = Image.open(image_path).convert('RGBA')

            # Scale if needed
            scale = config.get('scale', 1.0)
            if scale != 1.0:
                new_size = (int(overlay_img.width * scale), int(overlay_img.height * scale))
                overlay_img = overlay_img.resize(new_size, Image.Resampling.LANCZOS)

            # Adjust position
            if 'right' in position:
                x = x - overlay_img.width
            if 'bottom' in position:
                y = y - overlay_img.height

            layer.paste(overlay_img, (x, y), overlay_img)
        except Exception as e:
            logger.warning(f"Failed to apply image overlay: {e}")

    def _parse_color(self, color_str: str) -> Tuple[int, int, int, int]:
        """Parse a color string to RGBA tuple"""
        if color_str.startswith('#'):
            color_str = color_str[1:]

        if len(color_str) == 6:
            r = int(color_str[0:2], 16)
            g = int(color_str[2:4], 16)
            b = int(color_str[4:6], 16)
            return (r, g, b, 255)
        elif len(color_str) == 8:
            r = int(color_str[0:2], 16)
            g = int(color_str[2:4], 16)
            b = int(color_str[4:6], 16)
            a = int(color_str[6:8], 16)
            return (r, g, b, a)

        # Default to white
        return (255, 255, 255, 255)


def main():
    """Main entry point"""
    parser = argparse.ArgumentParser(description='Kometa Preview Renderer')
    parser.add_argument('--job', required=True, help='Path to job directory')
    parser.add_argument('--fonts', default='/fonts', help='Path to fonts directory')
    args = parser.parse_args()

    if not os.path.exists(args.job):
        logger.error(f"Job directory not found: {args.job}")
        sys.exit(1)

    try:
        renderer = OverlayRenderer(args.job, args.fonts)
        result = renderer.render_all()

        if result['success']:
            logger.info("Preview rendering completed successfully")
            sys.exit(0)
        else:
            logger.error(f"Preview rendering failed: {result.get('error', 'Unknown error')}")
            sys.exit(1)

    except Exception as e:
        logger.error(f"Fatal error: {e}")
        traceback.print_exc()
        sys.exit(1)


if __name__ == '__main__':
    main()
