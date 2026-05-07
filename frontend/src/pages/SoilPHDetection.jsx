    import { useEffect, useMemo, useRef, useState } from "react";

    const API_BASE_URL = "http://localhost:5000";
    const MAX_POINTS = 4;
    const HANDLE_RADIUS = 8;

    function phStatus(ph) {
    if (ph < 6.0) {
        return {
        label: "Acidic",
        color: "#e67e22",
        bg: "#fef9f0",
        rec: "Apply agricultural lime (CaCO3) to raise pH. Recommended: 1-2 tonnes/ha. Test again after 6 weeks.",
        };
    }

    if (ph <= 7.5) {
        return {
        label: "Neutral",
        color: "#2E7D32",
        bg: "#f0f8f0",
        rec: "Soil pH is in the ideal range for most crops. Maintain organic matter levels. Regular monitoring advised.",
        };
    }

    return {
        label: "Alkaline",
        color: "#8e44ad",
        bg: "#f9f0fe",
        rec: "Apply sulphur or gypsum to lower pH. Use acidifying fertilisers (ammonium sulphate). Avoid excessive liming.",
    };
    }

    function phMeter(ph) {
    return { pct: (ph / 14) * 100 };
    }

    function clamp(value, min, max) {
    return Math.min(Math.max(value, min), max);
    }

    export default function SoilPHDetection() {
    const [image, setImage] = useState(null);
    const [preview, setPreview] = useState(null);
    const [result, setResult] = useState(null);
    const [error, setError] = useState(null);
    const [loading, setLoading] = useState(false);
    const [imageMeta, setImageMeta] = useState({ width: 0, height: 0 });
    const [displaySize, setDisplaySize] = useState({ width: 0, height: 0 });
    const [points, setPoints] = useState([]);
    const [draggingIndex, setDraggingIndex] = useState(null);
    const [polygonConfirmed, setPolygonConfirmed] = useState(false);

    const imageRef = useRef(null);
    const stageRef = useRef(null);

    useEffect(() => {
        if (!imageRef.current) return undefined;

        const updateDisplaySize = () => {
        if (!imageRef.current) return;
        const rect = imageRef.current.getBoundingClientRect();
        setDisplaySize({
            width: rect.width,
            height: rect.height,
        });
        };

        updateDisplaySize();

        const observer = new ResizeObserver(updateDisplaySize);
        observer.observe(imageRef.current);

        window.addEventListener("resize", updateDisplaySize);

        return () => {
        observer.disconnect();
        window.removeEventListener("resize", updateDisplaySize);
        };
    }, [preview]);

    const displayPoints = useMemo(() => {
        if (!imageMeta.width || !imageMeta.height || !displaySize.width || !displaySize.height) {
        return [];
        }

        return points.map((point) => ({
        x: (point.x / imageMeta.width) * displaySize.width,
        y: (point.y / imageMeta.height) * displaySize.height,
        }));
    }, [points, imageMeta, displaySize]);

    const pointsForRequest = useMemo(
        () => points.map((point) => ({ x: Number(point.x.toFixed(2)), y: Number(point.y.toFixed(2)) })),
        [points],
    );

    const getOriginalPointFromClient = (clientX, clientY) => {
        if (!imageRef.current || !imageMeta.width || !imageMeta.height) {
        return null;
        }

        const rect = imageRef.current.getBoundingClientRect();
        if (!rect.width || !rect.height) {
        return null;
        }

        const px = clamp(clientX - rect.left, 0, rect.width);
        const py = clamp(clientY - rect.top, 0, rect.height);

        return {
        x: (px / rect.width) * imageMeta.width,
        y: (py / rect.height) * imageMeta.height,
        };
    };

    useEffect(() => {
        if (draggingIndex === null) return undefined;

        const handlePointerMove = (event) => {
        const next = getOriginalPointFromClient(event.clientX, event.clientY);
        if (!next) return;

        setPoints((prev) => {
            const updated = [...prev];
            updated[draggingIndex] = next;
            return updated;
        });
        setPolygonConfirmed(false);
        };

        const stopDrag = () => setDraggingIndex(null);

        window.addEventListener("mousemove", handlePointerMove);
        window.addEventListener("mouseup", stopDrag);

        return () => {
        window.removeEventListener("mousemove", handlePointerMove);
        window.removeEventListener("mouseup", stopDrag);
        };
    }, [draggingIndex, imageMeta]);

    const handleImageSelect = (event) => {
        const file = event.target.files?.[0];
        if (!file) return;

        setImage(file);
        setError(null);
        setResult(null);
        setPoints([]);
        setPolygonConfirmed(false);

        const reader = new FileReader();
        reader.onload = (readerEvent) => {
        setPreview(readerEvent.target?.result || null);
        };
        reader.readAsDataURL(file);
    };

    const handleImageLoad = (event) => {
        setImageMeta({
        width: event.currentTarget.naturalWidth,
        height: event.currentTarget.naturalHeight,
        });
        const rect = event.currentTarget.getBoundingClientRect();
        setDisplaySize({
        width: rect.width,
        height: rect.height,
        });
    };

    const handleStageClick = (event) => {
        if (!imageMeta.width || points.length >= MAX_POINTS) return;

        const next = getOriginalPointFromClient(event.clientX, event.clientY);
        if (!next) return;

        setPoints((prev) => [...prev, next]);
        setPolygonConfirmed(false);
    };

    const handleConfirmPolygon = () => {
        if (points.length !== MAX_POINTS) {
        setError("Please select exactly 4 points before confirming.");
        return;
        }
        setError(null);
        setPolygonConfirmed(true);
    };

    const handleResetPoints = () => {
        setPoints([]);
        setPolygonConfirmed(false);
        setResult(null);
        setError(null);
    };

    const handleDetect = async () => {
        if (!image) {
        setError("Please select an image");
        return;
        }

        if (points.length > 0 && points.length < MAX_POINTS) {
        setError("Please select 4 points or reset and use auto-detection.");
        return;
        }

        if (points.length === MAX_POINTS && !polygonConfirmed) {
        setError("Please confirm your polygon selection before detection.");
        return;
        }

        setError(null);
        setLoading(true);

        try {
        const base64 = await new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = (readerEvent) => {
            const value = readerEvent.target?.result;
            if (typeof value !== "string") {
                reject(new Error("Failed to read image file"));
                return;
            }
            resolve(value.split(",")[1]);
            };
            reader.onerror = () => reject(new Error("Failed to read image file"));
            reader.readAsDataURL(image);
        });

        const response = await fetch(`${API_BASE_URL}/v1/ph/detect`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
            image_base64: base64,
            points: polygonConfirmed ? pointsForRequest : null,
            roi_x: null,
            roi_y: null,
            roi_w: null,
            roi_h: null,
            }),
        });

        if (!response.ok) {
            const errData = await response.json();
            throw new Error(errData.detail || `HTTP ${response.status}`);
        }

        const data = await response.json();
        setResult(data);
        } catch (err) {
        setError(err.message || "Failed to detect pH");
        } finally {
        setLoading(false);
        }
    };

    const handleReset = () => {
        setImage(null);
        setPreview(null);
        setResult(null);
        setError(null);
        setPoints([]);
        setPolygonConfirmed(false);
        setImageMeta({ width: 0, height: 0 });
        setDisplaySize({ width: 0, height: 0 });
    };

    const meter = result ? phMeter(result.detected_ph) : null;
    const status = result ? phStatus(result.detected_ph) : null;

    return (
        <div className="page-container">
        <div className="page-content">
            <h1>Soil pH Detection</h1>
            <p className="page-subtitle">
            Upload a pH strip photo, mark 4 corner points on the strip area, and run LAB-based detection.
            </p>

            <div className="form-section">
            <h2>Upload and Mark pH Region</h2>
            <p className="section-help">
                Click 4 points on the strip region. You can drag points to refine selection, then confirm polygon.
                If you skip points, backend auto-detection will still run.
            </p>

            {!preview && (
                <div className="drop-zone" style={{ position: "relative" }}>
                <div className="drop-placeholder">
                    <div className="drop-icon">📸</div>
                    <p className="drop-label">Select pH Strip Image</p>
                    <p className="drop-sub">PNG or JPG, at least 200x200 pixels</p>
                </div>
                <input
                    type="file"
                    accept="image/*"
                    onChange={handleImageSelect}
                    style={{
                    position: "absolute",
                    inset: 0,
                    width: "100%",
                    height: "100%",
                    opacity: 0,
                    cursor: "pointer",
                    }}
                />
                </div>
            )}

            {preview && (
                <div
                style={{
                    position: "relative",
                    borderRadius: "12px",
                    overflow: "hidden",
                    border: "1px solid #dce3dc",
                    background: "#f8fbf8",
                }}
                >
                <img
                    ref={imageRef}
                    src={preview}
                    alt="pH Strip"
                    onLoad={handleImageLoad}
                    style={{
                    width: "100%",
                    maxHeight: "560px",
                    objectFit: "contain",
                    display: "block",
                    userSelect: "none",
                    }}
                />

                {displaySize.width > 0 && displaySize.height > 0 && (
                    <svg
                    ref={stageRef}
                    width={displaySize.width}
                    height={displaySize.height}
                    onClick={handleStageClick}
                    style={{
                        position: "absolute",
                        left: "50%",
                        top: "50%",
                        transform: "translate(-50%, -50%)",
                        cursor: points.length < MAX_POINTS ? "crosshair" : "default",
                        touchAction: "none",
                    }}
                    >
                    {displayPoints.length >= 3 && (
                        <polygon
                        points={displayPoints.map((p) => `${p.x},${p.y}`).join(" ")}
                        fill="rgba(29, 143, 74, 0.22)"
                        stroke="rgba(29, 143, 74, 0.9)"
                        strokeWidth="2"
                        />
                    )}

                    {displayPoints.length === 2 && (
                        <line
                        x1={displayPoints[0].x}
                        y1={displayPoints[0].y}
                        x2={displayPoints[1].x}
                        y2={displayPoints[1].y}
                        stroke="rgba(29, 143, 74, 0.9)"
                        strokeWidth="2"
                        />
                    )}

                    {displayPoints.map((point, index) => (
                        <g
                        key={`point-${index}`}
                        onMouseDown={(event) => {
                            event.stopPropagation();
                            event.preventDefault();
                            setDraggingIndex(index);
                        }}
                        >
                        <circle cx={point.x} cy={point.y} r={HANDLE_RADIUS} fill="#1d8f4a" stroke="#ffffff" strokeWidth="2" />
                        <text
                            x={point.x}
                            y={point.y + 4}
                            textAnchor="middle"
                            style={{ fill: "#ffffff", fontWeight: 700, fontSize: "11px", pointerEvents: "none" }}
                        >
                            {index + 1}
                        </text>
                        </g>
                    ))}
                    </svg>
                )}
                </div>
            )}

            {preview && (
                <div style={{ marginTop: "12px", color: "#5a6a5a", fontSize: "14px" }}>
                <strong>{points.length}/4</strong> points selected
                {polygonConfirmed && points.length === MAX_POINTS ? " - Polygon confirmed" : ""}
                </div>
            )}

            {preview && (
                <div className="action-row" style={{ flexWrap: "wrap", gap: "10px" }}>
                <button className="btn btn-secondary" onClick={handleResetPoints} type="button">
                    Reset Points
                </button>
                <button
                    className="btn btn-secondary"
                    onClick={handleConfirmPolygon}
                    type="button"
                    disabled={points.length !== MAX_POINTS}
                >
                    Confirm Polygon
                </button>
                <button className="btn btn-primary" onClick={handleDetect} disabled={loading} type="button">
                    {loading ? "Detecting..." : "Detect pH"}
                </button>
                <button className="btn btn-secondary" onClick={handleReset} type="button">
                    Change Image
                </button>
                </div>
            )}
            </div>

            {error && (
            <div className="error-box">
                <strong>Error:</strong> {error}
            </div>
            )}

            {result && status && meter && (
            <div className="result-section">
                <h2>pH Analysis Result</h2>

                <div className="result-card" style={{ background: status.bg }}>
                <p className="result-label">Detected pH Value</p>
                <p className="result-big" style={{ color: status.color, fontSize: 44, margin: "8px 0" }}>
                    {result.detected_ph.toFixed(1)}
                </p>

                <div className="ph-scale">
                    <div className="ph-gradient"></div>
                    <div className="ph-marker" style={{ left: `${meter.pct}%` }}></div>
                </div>
                <div className="ph-scale-labels">
                    <span>0 - Very Acidic</span>
                    <span>7 - Neutral</span>
                    <span>14 - Alkaline</span>
                </div>
                </div>

                <div className="result-card" style={{ border: `2px solid ${status.color}44` }}>
                <p className="result-label">Soil Status</p>
                <p className="result-big" style={{ color: status.color, fontSize: 22, margin: "8px 0" }}>
                    {status.label}
                </p>
                <p className="result-status good" style={{ color: status.color }}>
                    {result.nature} Soil
                </p>
                </div>

                <div className="result-card">
                <p className="result-label">Detected Color</p>
                <p style={{ margin: "8px 0 0", fontSize: "16px", fontWeight: 600 }}>{result.color_name}</p>
                <p style={{ margin: "4px 0 0", fontSize: "13px", color: "#7d877f" }}>
                    Confidence: {result.confidence_percent}%
                </p>
                </div>

                <div className="result-card" style={{ borderLeft: `4px solid ${status.color}` }}>
                <p className="result-label">Soil Correction Advice</p>
                <p style={{ margin: "8px 0 0", fontSize: "14px", lineHeight: 1.6 }}>{status.rec}</p>
                </div>

                <div className="model-info">
                <small>Model: {result.model_name}</small>
                </div>
            </div>
            )}

            {!result && !loading && preview && (
            <div className="result-section">
                <div style={{ textAlign: "center", color: "#7d877f", padding: "28px 20px" }}>
                <p>
                    Select 4 points and confirm polygon for precise analysis, or click Detect pH directly to use auto ROI.
                </p>
                </div>
            </div>
            )}
        </div>
        </div>
    );
    }
