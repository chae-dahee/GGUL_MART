# 로비 배경을 렌더한다.
# 실행: blender -b -P tools/art/lobby.py
# 결과: public/art/lobby.png
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).parent))
import kit  # noqa: E402

kit.render("lobby", (-11, -12.5, 1.6), (-5.5, 0.4, 3.2))
