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
