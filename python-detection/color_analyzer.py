"""
Color Analysis for Colorblind Users
Extracts dominant colors and determines if they're problematic for specific colorblindness types
"""

from enum import Enum
from typing import Optional
import logging

import cv2
import numpy as np

logger = logging.getLogger(__name__)


class ColorBlindnessType(Enum):
    """Types of color blindness"""
    NORMAL = "normal"
    PROTANOPIA = "protanopia"       # Red-blind
    PROTANOMALY = "protanomaly"     # Red-weak
    DEUTERANOPIA = "deuteranopia"   # Green-blind
    DEUTERANOMALY = "deuteranomaly" # Green-weak
    TRITANOPIA = "tritanopia"       # Blue-blind
    TRITANOMALY = "tritanomaly"     # Blue-weak
    ACHROMATOPSIA = "achromatopsia" # Complete color blindness


# HSV color ranges for detection
# Format: (H_min, S_min, V_min), (H_max, S_max, V_max)
COLOR_RANGES = {
    "red_low": ((0, 100, 100), (10, 255, 255)),
    "red_high": ((160, 100, 100), (180, 255, 255)),
    "orange": ((10, 100, 100), (25, 255, 255)),
    "yellow": ((25, 100, 100), (35, 255, 255)),
    "green": ((35, 100, 100), (85, 255, 255)),
    "cyan": ((85, 100, 100), (100, 255, 255)),
    "blue": ((100, 100, 100), (130, 255, 255)),
    "purple": ((130, 100, 100), (160, 255, 255)),
    "white": ((0, 0, 200), (180, 30, 255)),
    "black": ((0, 0, 0), (180, 255, 50)),
}

# Which colors are problematic for each colorblindness type
PROBLEMATIC_COLORS = {
    ColorBlindnessType.NORMAL: [],
    ColorBlindnessType.PROTANOPIA: ["red_low", "red_high", "orange", "green"],
    ColorBlindnessType.PROTANOMALY: ["red_low", "red_high", "orange"],
    ColorBlindnessType.DEUTERANOPIA: ["red_low", "red_high", "green", "yellow"],
    ColorBlindnessType.DEUTERANOMALY: ["green", "yellow"],
    ColorBlindnessType.TRITANOPIA: ["blue", "yellow", "cyan"],
    ColorBlindnessType.TRITANOMALY: ["blue", "yellow"],
    ColorBlindnessType.ACHROMATOPSIA: list(COLOR_RANGES.keys()),  # All colors problematic
}

# Human-readable color names
COLOR_DISPLAY_NAMES = {
    "red_low": "red",
    "red_high": "red",
    "orange": "orange",
    "yellow": "yellow",
    "green": "green",
    "cyan": "cyan",
    "blue": "blue",
    "purple": "purple",
    "white": "white",
    "black": "black",
}


class ColorAnalyzer:
    """Analyzes colors in image regions for colorblind assistance"""
    
    def __init__(self):
        pass
    
    def detect_colors(self, roi: np.ndarray) -> dict[str, float]:
        """
        Detect color presence in region of interest
        
        Args:
            roi: BGR image region
            
        Returns:
            Dictionary mapping color names to their percentage presence
        """
        if roi.size == 0:
            return {}
        
        # Convert to HSV
        hsv = cv2.cvtColor(roi, cv2.COLOR_BGR2HSV)
        total_pixels = roi.shape[0] * roi.shape[1]
        
        color_percentages = {}
        
        for color_name, (lower, upper) in COLOR_RANGES.items():
            lower = np.array(lower, dtype=np.uint8)
            upper = np.array(upper, dtype=np.uint8)
            
            # Create mask for this color
            mask = cv2.inRange(hsv, lower, upper)
            
            # Calculate percentage
            color_pixels = cv2.countNonZero(mask)
            percentage = (color_pixels / total_pixels) * 100
            
            if percentage > 5:  # Only include if more than 5%
                color_percentages[color_name] = round(percentage, 1)
        
        return color_percentages
    
    def get_dominant_colors(self, roi: np.ndarray, top_n: int = 3) -> list[str]:
        """
        Get the top N dominant colors in a region
        
        Args:
            roi: BGR image region
            top_n: Number of colors to return
            
        Returns:
            List of dominant color names
        """
        color_percentages = self.detect_colors(roi)
        
        # Sort by percentage
        sorted_colors = sorted(
            color_percentages.items(),
            key=lambda x: x[1],
            reverse=True
        )
        
        # Get unique display names
        seen = set()
        dominant = []
        for color_name, _ in sorted_colors:
            display_name = COLOR_DISPLAY_NAMES.get(color_name, color_name)
            if display_name not in seen:
                seen.add(display_name)
                dominant.append(display_name)
            if len(dominant) >= top_n:
                break
        
        return dominant
    
    def is_problematic_for_user(
        self, 
        detected_colors: dict[str, float], 
        colorblindness_type: ColorBlindnessType
    ) -> tuple[bool, Optional[str]]:
        """
        Check if detected colors are problematic for user's colorblindness type
        
        Args:
            detected_colors: Dictionary of color names and percentages
            colorblindness_type: User's colorblindness type
            
        Returns:
            Tuple of (is_problematic, warning_message)
        """
        problematic = PROBLEMATIC_COLORS.get(colorblindness_type, [])
        
        if not problematic:
            return False, None
        
        # Check if any significant colors are problematic
        found_problematic = []
        for color_name, percentage in detected_colors.items():
            if color_name in problematic and percentage > 10:
                display_name = COLOR_DISPLAY_NAMES.get(color_name, color_name)
                found_problematic.append((display_name, percentage))
        
        if found_problematic:
            # Generate warning message
            colors_str = ", ".join([c[0] for c in found_problematic[:2]])
            warning = f"Contains {colors_str} - may be difficult to see"
            return True, warning
        
        return False, None
    
    def analyze_region(
        self, 
        roi: np.ndarray, 
        colorblindness_type: ColorBlindnessType
    ) -> dict:
        """
        Full color analysis of a region for colorblind assistance
        
        Args:
            roi: BGR image region
            colorblindness_type: User's colorblindness type
            
        Returns:
            Dictionary with analysis results
        """
        if roi.size == 0:
            return {
                "dominant_colors": [],
                "is_problematic": False,
                "warning": None
            }
        
        # Detect all colors
        detected_colors = self.detect_colors(roi)
        
        # Get dominant colors
        dominant = self.get_dominant_colors(roi)
        
        # Check if problematic
        is_problematic, warning = self.is_problematic_for_user(
            detected_colors, 
            colorblindness_type
        )
        
        return {
            "dominant_colors": dominant,
            "is_problematic": is_problematic,
            "warning": warning,
            "color_breakdown": detected_colors
        }
    
    def analyze_traffic_light(self, roi: np.ndarray) -> dict:
        """
        Specialized analysis for traffic lights
        
        Args:
            roi: BGR image region containing traffic light
            
        Returns:
            Dictionary with traffic light state
        """
        if roi.size == 0:
            return {"state": "unknown", "confidence": 0}
        
        colors = self.detect_colors(roi)
        
        # Check for each traffic light color
        red_pct = colors.get("red_low", 0) + colors.get("red_high", 0)
        yellow_pct = colors.get("yellow", 0)
        green_pct = colors.get("green", 0)
        
        # Determine state
        if red_pct > yellow_pct and red_pct > green_pct and red_pct > 10:
            return {"state": "red", "confidence": min(red_pct / 100, 1.0)}
        elif yellow_pct > red_pct and yellow_pct > green_pct and yellow_pct > 10:
            return {"state": "yellow", "confidence": min(yellow_pct / 100, 1.0)}
        elif green_pct > red_pct and green_pct > yellow_pct and green_pct > 10:
            return {"state": "green", "confidence": min(green_pct / 100, 1.0)}
        else:
            return {"state": "unknown", "confidence": 0}
