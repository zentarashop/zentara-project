#!/usr/bin/env python3
"""
Instagram MCP Server for ZENTARA
ดึง IG organic insights ทุกโพสต์ผ่าน Meta Graph API
"""

import json
import os
from typing import Optional, List
from enum import Enum

import httpx
from pydantic import BaseModel, Field, ConfigDict
from mcp.server.fastmcp import FastMCP

# ─────────────────────────────────────────
# Init
# ─────────────────────────────────────────
mcp = FastMCP("instagram_mcp")

GRAPH_API_BASE = "https://graph.facebook.com/v19.0"
ACCESS_TOKEN = os.environ.get("IG_ACCESS_TOKEN", "")
IG_USER_ID = os.environ.get("IG_USER_ID", "")


# ─────────────────────────────────────────
# Enums & Models
# ─────────────────────────────────────────
class DatePreset(str, Enum):
    LAST_7D = "last_7d"
    LAST_14D = "last_14d"
    LAST_30D = "last_30d"
    LAST_90D = "last_90d"


class PostMetric(str, Enum):
    REACH = "reach"
    IMPRESSIONS = "impressions"
    LIKES = "likes"
    COMMENTS = "comments"
    SAVES = "saves"
    SHARES = "shares"
    ENGAGEMENT = "engagement"


class ProfileInsightsInput(BaseModel):
    model_config = ConfigDict(str_strip_whitespace=True, extra="forbid")
    period: str = Field(
        default="day",
        description="ช่วงเวลา: 'day' หรือ 'week' หรือ 'month'",
    )
    since: Optional[str] = Field(
        default=None,
        description="วันเริ่มต้น format YYYY-MM-DD เช่น '2024-01-01'",
    )
    until: Optional[str] = Field(
        default=None,
        description="วันสิ้นสุด format YYYY-MM-DD เช่น '2024-01-31'",
    )


class MediaListInput(BaseModel):
    model_config = ConfigDict(str_strip_whitespace=True, extra="forbid")
    limit: int = Field(default=20, ge=1, le=100, description="จำนวนโพสต์ที่ต้องการ (1-100)")
    after: Optional[str] = Field(default=None, description="Cursor สำหรับ pagination")


class PostInsightsInput(BaseModel):
    model_config = ConfigDict(str_strip_whitespace=True, extra="forbid")
    media_id: str = Field(..., description="ID ของโพสต์ที่ต้องการดู เช่น '17854360229135492'")


class TopPostsInput(BaseModel):
    model_config = ConfigDict(str_strip_whitespace=True, extra="forbid")
    metric: PostMetric = Field(
        default=PostMetric.REACH,
        description="Metric ที่ใช้จัดอันดับ: reach, impressions, likes, comments, saves, shares",
    )
    limit: int = Field(default=10, ge=1, le=50, description="จำนวนโพสต์ที่ต้องการ")


class AudienceInput(BaseModel):
    model_config = ConfigDict(str_strip_whitespace=True, extra="forbid")
    breakdown: str = Field(
        default="age,gender",
        description="ข้อมูลที่ต้องการ: 'age,gender' หรือ 'city' หรือ 'country'",
    )


# ─────────────────────────────────────────
# Shared utilities
# ─────────────────────────────────────────
async def _graph_get(endpoint: str, params: dict = {}) -> dict:
    """Call Meta Graph API with auto token injection."""
    params = {**params, "access_token": ACCESS_TOKEN}
    url = f"{GRAPH_API_BASE}/{endpoint}"
    async with httpx.AsyncClient() as client:
        r = await client.get(url, params=params, timeout=30.0)
        r.raise_for_status()
        return r.json()


def _handle_error(e: Exception) -> str:
    if isinstance(e, httpx.HTTPStatusError):
        try:
            detail = e.response.json().get("error", {}).get("message", "")
        except Exception:
            detail = ""
        code = e.response.status_code
        if code == 401:
            return "Error: Access token หมดอายุหรือไม่ถูกต้อง — กรุณาสร้าง Long-lived token ใหม่"
        if code == 403:
            return "Error: ไม่มีสิทธิ์เข้าถึงข้อมูลนี้ — ตรวจสอบ Permission ของ App"
        if code == 429:
            return "Error: Rate limit — รอสักครู่แล้วลองใหม่"
        return f"Error {code}: {detail or 'API request failed'}"
    if isinstance(e, httpx.TimeoutException):
        return "Error: Request timeout — ลองใหม่อีกครั้ง"
    return f"Error: {type(e).__name__}: {e}"


def _check_config() -> Optional[str]:
    if not ACCESS_TOKEN:
        return "Error: ยังไม่ได้ตั้งค่า IG_ACCESS_TOKEN — ดู README_SETUP.md"
    if not IG_USER_ID:
        return "Error: ยังไม่ได้ตั้งค่า IG_USER_ID — ดู README_SETUP.md"
    return None


# ─────────────────────────────────────────
# Tools
# ─────────────────────────────────────────

@mcp.tool(
    name="ig_get_profile",
    annotations={
        "title": "ดูข้อมูลพื้นฐาน Instagram Profile",
        "readOnlyHint": True,
        "destructiveHint": False,
        "idempotentHint": True,
        "openWorldHint": True,
    },
)
async def ig_get_profile(_: None = None) -> str:
    """
    ดูข้อมูลพื้นฐานของ @zentara_shop: followers, media count, biography, website

    Returns:
        str: ข้อมูล profile ในรูปแบบ markdown
    """
    err = _check_config()
    if err:
        return err
    try:
        data = await _graph_get(
            IG_USER_ID,
            params={
                "fields": "id,username,name,biography,website,followers_count,follows_count,media_count,profile_picture_url"
            },
        )
        lines = [
            "# ZENTARA Instagram Profile",
            "",
            f"**Username:** @{data.get('username', '-')}",
            f"**Followers:** {data.get('followers_count', 0):,} คน",
            f"**Following:** {data.get('follows_count', 0):,}",
            f"**โพสต์ทั้งหมด:** {data.get('media_count', 0):,}",
            f"**Bio:** {data.get('biography', '-')}",
            f"**Website:** {data.get('website', '-')}",
        ]
        return "\n".join(lines)
    except Exception as e:
        return _handle_error(e)


@mcp.tool(
    name="ig_get_profile_insights",
    annotations={
        "title": "ดู Profile Insights (reach, impressions, follower growth)",
        "readOnlyHint": True,
        "destructiveHint": False,
        "idempotentHint": True,
        "openWorldHint": True,
    },
)
async def ig_get_profile_insights(params: ProfileInsightsInput) -> str:
    """
    ดู insights ระดับ account: reach, impressions, profile_views, follower_count
    ตามช่วงเวลาที่กำหนด

    Args:
        params.period: 'day' / 'week' / 'month'
        params.since: วันเริ่มต้น YYYY-MM-DD (optional)
        params.until: วันสิ้นสุด YYYY-MM-DD (optional)

    Returns:
        str: สรุป account insights รายวัน/สัปดาห์/เดือน
    """
    err = _check_config()
    if err:
        return err
    try:
        metrics = "reach,impressions,profile_views,follower_count"
        query: dict = {
            "metric": metrics,
            "period": params.period,
        }
        if params.since:
            query["since"] = params.since
        if params.until:
            query["until"] = params.until

        data = await _graph_get(f"{IG_USER_ID}/insights", params=query)
        insight_map = {}
        for item in data.get("data", []):
            name = item.get("name")
            values = item.get("values", [])
            insight_map[name] = values

        lines = [f"# ZENTARA IG Profile Insights (period: {params.period})", ""]
        for metric, values in insight_map.items():
            lines.append(f"## {metric}")
            for v in values[-7:]:  # แสดง 7 จุดล่าสุด
                lines.append(f"- {v.get('end_time', '')[:10]}: {v.get('value', 0):,}")
            lines.append("")

        return "\n".join(lines)
    except Exception as e:
        return _handle_error(e)


@mcp.tool(
    name="ig_get_media_list",
    annotations={
        "title": "ดูรายการโพสต์ทั้งหมดพร้อม stats",
        "readOnlyHint": True,
        "destructiveHint": False,
        "idempotentHint": True,
        "openWorldHint": True,
    },
)
async def ig_get_media_list(params: MediaListInput) -> str:
    """
    ดูรายการโพสต์ทั้งหมดของ @zentara_shop พร้อม likes, comments, timestamp

    Args:
        params.limit: จำนวนโพสต์ (default 20, max 100)
        params.after: cursor สำหรับ page ถัดไป

    Returns:
        str: รายการโพสต์พร้อม ID สำหรับใช้ใน ig_get_post_insights
    """
    err = _check_config()
    if err:
        return err
    try:
        query: dict = {
            "fields": "id,caption,media_type,timestamp,like_count,comments_count,permalink",
            "limit": params.limit,
        }
        if params.after:
            query["after"] = params.after

        data = await _graph_get(f"{IG_USER_ID}/media", params=query)
        posts = data.get("data", [])
        paging = data.get("paging", {})

        if not posts:
            return "ไม่พบโพสต์"

        lines = [f"# ZENTARA โพสต์ล่าสุด ({len(posts)} โพสต์)", ""]
        for i, p in enumerate(posts, 1):
            caption_preview = (p.get("caption") or "")[:60].replace("\n", " ")
            lines.append(
                f"{i}. [{p.get('media_type','')}] {p.get('timestamp','')[:10]} "
                f"| ❤️ {p.get('like_count',0):,} | 💬 {p.get('comments_count',0):,}"
            )
            lines.append(f"   ID: `{p.get('id')}`  |  {caption_preview}...")
            lines.append("")

        if paging.get("cursors", {}).get("after"):
            lines.append(f"▶ Next cursor: `{paging['cursors']['after']}`")

        return "\n".join(lines)
    except Exception as e:
        return _handle_error(e)


@mcp.tool(
    name="ig_get_post_insights",
    annotations={
        "title": "ดู Insights ของโพสต์แต่ละชิ้น",
        "readOnlyHint": True,
        "destructiveHint": False,
        "idempotentHint": True,
        "openWorldHint": True,
    },
)
async def ig_get_post_insights(params: PostInsightsInput) -> str:
    """
    ดู insights ละเอียดของโพสต์ชิ้นหนึ่ง: reach, impressions, saves, shares, plays (Reel)

    Args:
        params.media_id: ID ของโพสต์ (หาได้จาก ig_get_media_list)

    Returns:
        str: insights ครบทุก metric ของโพสต์นั้น
    """
    err = _check_config()
    if err:
        return err
    try:
        # ดึง media type ก่อน
        media_data = await _graph_get(
            params.media_id,
            params={"fields": "id,media_type,timestamp,caption,permalink"},
        )
        media_type = media_data.get("media_type", "IMAGE")

        # เลือก metric ตาม media type
        if media_type == "VIDEO":
            metric_str = "reach,impressions,saved,shares,video_views,likes,comments"
        elif media_type == "REEL":
            metric_str = "reach,impressions,saved,shares,plays,likes,comments,total_interactions"
        else:
            metric_str = "reach,impressions,saved,shares,likes,comments,total_interactions"

        insights = await _graph_get(
            f"{params.media_id}/insights",
            params={"metric": metric_str},
        )

        lines = [
            f"# Post Insights",
            f"**ID:** {params.media_id}",
            f"**Type:** {media_type}",
            f"**Date:** {media_data.get('timestamp','')[:10]}",
            f"**Link:** {media_data.get('permalink','')}",
            "",
            "## Metrics",
        ]
        for item in insights.get("data", []):
            lines.append(f"- **{item['name']}:** {item.get('values',[{}])[0].get('value', item.get('value', 0)):,}")

        caption = (media_data.get("caption") or "")[:120]
        lines += ["", f"**Caption:** {caption}..."]
        return "\n".join(lines)
    except Exception as e:
        return _handle_error(e)


@mcp.tool(
    name="ig_get_top_posts",
    annotations={
        "title": "ดู Top Posts ตาม metric ที่เลือก",
        "readOnlyHint": True,
        "destructiveHint": False,
        "idempotentHint": False,
        "openWorldHint": True,
    },
)
async def ig_get_top_posts(params: TopPostsInput) -> str:
    """
    ดึงโพสต์ล่าสุดพร้อม insights แล้วจัดอันดับตาม metric ที่เลือก
    เช่น top 10 โพสต์ที่มี reach สูงสุด

    Args:
        params.metric: reach / impressions / likes / comments / saves / shares
        params.limit: จำนวน top posts (default 10)

    Returns:
        str: ranking โพสต์พร้อม metric ที่เลือก
    """
    err = _check_config()
    if err:
        return err
    try:
        # ดึง media list 50 โพสต์ล่าสุด
        data = await _graph_get(
            f"{IG_USER_ID}/media",
            params={
                "fields": "id,caption,media_type,timestamp,like_count,comments_count,permalink",
                "limit": 50,
            },
        )
        posts = data.get("data", [])

        # ใช้ like_count / comments_count จาก media โดยตรง (ไม่ต้อง call insights ซ้ำ)
        metric = params.metric.value
        if metric == "likes":
            sorted_posts = sorted(posts, key=lambda p: p.get("like_count", 0), reverse=True)
            key = "like_count"
        elif metric == "comments":
            sorted_posts = sorted(posts, key=lambda p: p.get("comments_count", 0), reverse=True)
            key = "comments_count"
        else:
            # reach/impressions/saves/shares ต้องดึง insights แยก (batch 10 อันแรก)
            results = []
            for post in posts[:20]:
                try:
                    ins = await _graph_get(
                        f"{post['id']}/insights",
                        params={"metric": metric},
                    )
                    val = 0
                    for item in ins.get("data", []):
                        if item["name"] == metric:
                            val = item.get("values", [{}])[0].get("value", item.get("value", 0))
                    results.append({**post, "_metric_val": val})
                except Exception:
                    results.append({**post, "_metric_val": 0})
            sorted_posts = sorted(results, key=lambda p: p.get("_metric_val", 0), reverse=True)
            key = "_metric_val"

        lines = [f"# ZENTARA Top {params.limit} Posts by {metric.upper()}", ""]
        for i, p in enumerate(sorted_posts[: params.limit], 1):
            caption_preview = (p.get("caption") or "")[:50].replace("\n", " ")
            val = p.get(key, 0)
            lines.append(
                f"{i}. {p.get('timestamp','')[:10]} | {metric}: **{val:,}** | {p.get('media_type','')}"
            )
            lines.append(f"   {caption_preview}...")
            lines.append(f"   🔗 {p.get('permalink','')}")
            lines.append("")

        return "\n".join(lines)
    except Exception as e:
        return _handle_error(e)


@mcp.tool(
    name="ig_get_audience_insights",
    annotations={
        "title": "ดู Audience Demographics",
        "readOnlyHint": True,
        "destructiveHint": False,
        "idempotentHint": True,
        "openWorldHint": True,
    },
)
async def ig_get_audience_insights(params: AudienceInput) -> str:
    """
    ดูข้อมูล audience ของ @zentara_shop: อายุ, เพศ, เมือง, ประเทศ

    Args:
        params.breakdown: 'age,gender' หรือ 'city' หรือ 'country'

    Returns:
        str: สรุป audience demographics
    """
    err = _check_config()
    if err:
        return err
    try:
        breakdowns = [b.strip() for b in params.breakdown.split(",")]
        results = []

        for bd in breakdowns:
            data = await _graph_get(
                f"{IG_USER_ID}/insights",
                params={"metric": "follower_demographics", "period": "lifetime", "breakdown": bd},
            )
            results.append((bd, data))

        lines = ["# ZENTARA Audience Insights", ""]
        for bd, data in results:
            lines.append(f"## {bd.upper()}")
            for item in data.get("data", []):
                for val in item.get("total_value", {}).get("breakdowns", []):
                    for result in sorted(
                        val.get("results", []),
                        key=lambda x: x.get("value", 0),
                        reverse=True,
                    )[:10]:
                        dim = ", ".join(str(d) for d in result.get("dimension_values", []))
                        lines.append(f"- {dim}: {result.get('value', 0):,}")
            lines.append("")

        return "\n".join(lines)
    except Exception as e:
        return _handle_error(e)


# ─────────────────────────────────────────
# Run
# ─────────────────────────────────────────
if __name__ == "__main__":
    mcp.run()
