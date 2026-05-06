from PIL import Image
from collections import Counter
import sys

def get_dominant_colors(image_path, num_colors=5):
    try:
        img = Image.open(image_path)
        img = img.convert('RGB')
        # Resize to speed up processing
        img = img.resize((100, 100))
        
        pixels = list(img.getdata())
        
        # Simple bucketing to reduce color space (e.g. round to nearest 10)
        bucketed_pixels = [(r//20*20, g//20*20, b//20*20) for r, g, b in pixels]
        
        counts = Counter(bucketed_pixels)
        top_colors = counts.most_common(num_colors)
        
        print("Dominant colors (RGB):")
        for color, count in top_colors:
            hex_color = "#{:02x}{:02x}{:02x}".format(color[0], color[1], color[2])
            print(f"{hex_color} - {count} pixels")
            
    except Exception as e:
        print(f"Error: {e}")

if __name__ == "__main__":
    get_dominant_colors(sys.argv[1])
