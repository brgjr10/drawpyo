import requests
from typing import Optional, Dict, Any, List


class DrawpyoClient:
    def __init__(self, base_url: str = "http://localhost:9749"):
        self.base_url = base_url.rstrip("/")

    def health(self) -> Dict[str, Any]:
        return requests.get(f"{self.base_url}/health").json()

    def list_projects(self) -> List[Dict[str, Any]]:
        return requests.get(f"{self.base_url}/projects").json()

    def get_project(self, project_id: str) -> Dict[str, Any]:
        return requests.get(f"{self.base_url}/projects/{project_id}").json()

    def create_project(self, name: str, path: str) -> Dict[str, Any]:
        return requests.post(
            f"{self.base_url}/projects",
            json={"name": name, "path": path},
        ).json()

    def add_block(
        self,
        project_id: str,
        title: str,
        x: float = 0,
        y: float = 0,
        width: float = 120,
        height: float = 60,
        description: str = "",
        image: Optional[str] = None,
        color: str = "#58a6ff",
    ) -> Dict[str, Any]:
        return requests.post(
            f"{self.base_url}/projects/{project_id}/blocks",
            json={
                "title": title,
                "x": x,
                "y": y,
                "width": width,
                "height": height,
                "description": description,
                "image": image,
                "color": color,
            },
        ).json()

    def update_block(
        self,
        project_id: str,
        block_id: str,
        title: Optional[str] = None,
        x: Optional[float] = None,
        y: Optional[float] = None,
        description: Optional[str] = None,
        image: Optional[str] = None,
        color: Optional[str] = None,
    ) -> Dict[str, Any]:
        payload = {k: v for k, v in {
            "title": title,
            "x": x,
            "y": y,
            "description": description,
            "image": image,
            "color": color,
        }.items() if v is not None}
        return requests.put(
            f"{self.base_url}/projects/{project_id}/blocks/{block_id}",
            json=payload,
        ).json()

    def delete_block(self, project_id: str, block_id: str) -> Dict[str, Any]:
        return requests.delete(
            f"{self.base_url}/projects/{project_id}/blocks/{block_id}"
        ).json()

    def add_connection(
        self,
        project_id: str,
        from_block_id: str,
        to_block_id: str,
        from_port: str = "right",
        to_port: str = "left",
        routing: str = "squared",
        waypoints: Optional[List[Dict[str, float]]] = None,
    ) -> Dict[str, Any]:
        return requests.post(
            f"{self.base_url}/projects/{project_id}/connections",
            json={
                "fromBlockId": from_block_id,
                "toBlockId": to_block_id,
                "fromPort": from_port,
                "toPort": to_port,
                "routing": routing,
                "waypoints": waypoints or [],
            },
        ).json()

    def delete_connection(self, project_id: str, connection_id: str) -> Dict[str, Any]:
        return requests.delete(
            f"{self.base_url}/projects/{project_id}/connections/{connection_id}"
        ).json()

    def update_connection(
        self,
        project_id: str,
        connection_id: str,
        from_block_id: Optional[str] = None,
        to_block_id: Optional[str] = None,
        from_port: Optional[str] = None,
        to_port: Optional[str] = None,
        routing: Optional[str] = None,
        waypoints: Optional[List[Dict[str, float]]] = None,
    ) -> Dict[str, Any]:
        payload = {k: v for k, v in {
            "fromBlockId": from_block_id,
            "toBlockId": to_block_id,
            "fromPort": from_port,
            "toPort": to_port,
            "routing": routing,
            "waypoints": waypoints,
        }.items() if v is not None}
        return requests.put(
            f"{self.base_url}/projects/{project_id}/connections/{connection_id}",
            json=payload,
        ).json()

    def export_image(self, project_id: str, transparent: bool = False) -> bytes:
        resp = requests.post(
            f"{self.base_url}/projects/{project_id}/export",
            json={"transparent": transparent},
        )
        resp.raise_for_status()
        return resp.content

    def set_theme(self, project_id: str, theme_name: str) -> Dict[str, Any]:
        return requests.post(
            f"{self.base_url}/projects/{project_id}/theme",
            json={"theme": theme_name},
        ).json()

    def set_viewport(self, project_id: str, x: float, y: float, scale: float) -> Dict[str, Any]:
        return requests.post(
            f"{self.base_url}/projects/{project_id}/viewport",
            json={"x": x, "y": y, "scale": scale},
        ).json()

    def delete_project(self, project_id: str) -> Dict[str, Any]:
        return requests.delete(
            f"{self.base_url}/projects/{project_id}"
        ).json()
