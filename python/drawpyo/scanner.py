import os
import re
import json
import sys
from typing import List, Dict, Any, Optional, Set, Tuple
from dataclasses import dataclass, asdict, field
from pathlib import Path
from collections import defaultdict


@dataclass
class Component:
    id: str
    type: str
    name: str
    technology: str
    file: str
    line: int
    description: str
    metadata: Dict[str, Any]

    def to_dict(self) -> Dict[str, Any]:
        return asdict(self)


@dataclass
class Connection:
    source: str
    target: str
    type: str
    confidence: float
    evidence: str

    def to_dict(self) -> Dict[str, Any]:
        return asdict(self)


IGNORED_DIRS = {
    'node_modules', '__pycache__', '.git', '.venv', 'venv', 'env',
    'dist', 'build', '.next', '.nuxt', 'target', 'bin', 'obj',
    '.idea', '.vscode', '.pytest_cache', '.mypy_cache', 'vendor',
    '.cache', 'coverage', '.nyc_output', 'logs', 'tmp', 'temp',
    '.kilo', '.github', '.gitlab', '__tests__', 'testdata',
    'fixtures', 'examples', 'example', 'docs', 'documentation',
}

SOURCE_EXT = {
    '.py', '.js', '.ts', '.jsx', '.tsx', '.go', '.java', '.kt', '.kts',
    '.rs', '.rb', '.php', '.cs', '.cpp', '.c', '.swift', '.dart',
    '.ex', '.exs', '.hs', '.ml', '.scala', '.clj', '.lisp',
}

CONFIG_EXT = {
    '.json', '.yaml', '.yml', '.toml', '.ini', '.cfg', '.conf', '.xml',
    '.properties', '.env', '.env.example', '.env.local', '.env.development',
    '.env.test', '.env.production', '.gitignore', '.dockerignore',
    '.editorconfig', '.eslintrc', '.prettierrc', '.babelrc',
}

BUILD_EXT = {
    'makefile', 'dockerfile', 'docker-compose.yml', 'docker-compose.yaml',
    'vagrantfile', 'terraform', 'pom.xml', 'build.gradle', 'build.gradle.kts',
    'cargo.toml', 'go.mod', 'go.sum', 'package.json', 'package-lock.json',
    'yarn.lock', 'pnpm-lock.yaml', 'requirements.txt', 'pyproject.toml',
    'setup.py', 'setup.cfg', 'manifest.json', 'gemfile', 'gemfile.lock',
}

DATA_EXT = {
    '.sql', '.csv', '.tsv', '.parquet', '.avro', '.orc', '.db', '.sqlite',
    '.sqlite3', '.mdb', '.accdb', '.pkl', '.pickle', '.hdf5', '.nc',
}

TEST_PATTERNS = {
    'test_', '_test.', '.test.', '.spec.', 'tests/', '__tests__/',
}

DOCS_EXT = {
    '.md', '.rst', '.txt', '.html', '.htm', '.pdf', '.doc', '.docx',
    '.adoc', '.tex',
}

ASSETS_EXT = {
    '.png', '.jpg', '.jpeg', '.gif', '.bmp', '.webp', '.svg', '.ico',
    '.mp3', '.mp4', '.wav', '.avi', '.mov', '.zip', '.tar', '.gz',
    '.ttf', '.otf', '.woff', '.woff2', '.eot', '.wasm',
}

# Patterns for detecting technologies and services
TECH_PATTERNS = {
    'fastapi': (r'from fastapi import|import fastapi|FastAPI\(', 'api', 'FastAPI'),
    'flask': (r'from flask import|import flask|Flask\(', 'api', 'Flask'),
    'django': (r'from django|import django|DJANGO', 'api', 'Django'),
    'express': (r'require\([\'"]express[\'"]\)|from [\'"]express[\'"]|express\(\)', 'api', 'Express'),
    'koa': (r'require\([\'"]koa[\'"]\)|from [\'"]koa[\'"]|new Koa\(', 'api', 'Koa'),
    'fastify': (r'require\([\'"]fastify[\'"]\)|from [\'"]fastify[\'"]|Fastify\(', 'api', 'Fastify'),
    'nestjs': (r'@nestjs|NestFactory', 'api', 'NestJS'),
    'spring': (r'@SpringBootApplication|@RestController|@Controller|springframework', 'api', 'Spring'),
    'gin': (r'gin\.|gin\.Default|gin\.New', 'api', 'Gin'),
    'echo': (r'echo\.|echo\.New|echo\.New', 'api', 'Echo'),
    'graphql': (r'graphql|gql`|ApolloClient|graphene', 'api', 'GraphQL'),
    'grpc': (r'grpc\.|grpcio|@grpc|proto\.New', 'api', 'gRPC'),
    'next': (r'next\.|next/|from [\'"]next[\'"]', 'api', 'Next.js'),
    'nuxt': (r'nuxt|from [\'"]nuxt[\'"]', 'api', 'Nuxt'),
    'sveltekit': (r'sveltekit|from [\'"]@sveltejs/kit[\'"]', 'api', 'SvelteKit'),
    
    'postgresql': (r'psycopg2|asyncpg|pg\.|postgresql|postgres|pgx\.|sqlx\.', 'database', 'PostgreSQL'),
    'mysql': (r'mysql|pymysql|mysqlclient|MySQL\.connect|createConnection.*mysql', 'database', 'MySQL'),
    'mongodb': (r'mongodb|pymongo|mongoose|MongoClient|motor\.', 'database', 'MongoDB'),
    'redis': (r'redis|ioredis|redis-py|StrictRedis|Redis\(', 'queue', 'Redis'),
    'celery': (r'celery\.Celery|from celery|import celery', 'queue', 'Celery'),
    'rabbitmq': (r'amqplib|pika|rabbitmq', 'queue', 'RabbitMQ'),
    'kafka': (r'kafka|kafkajs|confluent-kafka', 'queue', 'Kafka'),
    'sqlalchemy': (r'sqlalchemy|alembic', 'database', 'SQLAlchemy'),
    'prisma': (r'prisma|@prisma', 'database', 'Prisma'),
    'typeorm': (r'typeorm|TypeORM', 'database', 'TypeORM'),
    'sequelize': (r'sequelize|Sequelize', 'database', 'Sequelize'),
    
    'boto3': (r'boto3\.client|boto3\.resource|from boto3', 'cloud', 'AWS'),
    'aws-sdk': (r'@aws-sdk|aws-sdk', 'cloud', 'AWS SDK'),
    'google-cloud': (r'google-cloud|@google-cloud', 'cloud', 'Google Cloud'),
    'azure': (r'@azure|azure-', 'cloud', 'Azure'),
    'terraform': (r'terraform|tf\.', 'cloud', 'Terraform'),
    
    'docker': (r'docker|Dockerfile|docker-compose', 'service', 'Docker'),
    'kubernetes': (r'kubernetes|k8s|kubectl|helm', 'service', 'Kubernetes'),
    'nginx': (r'nginx|nginx\.conf', 'service', 'Nginx'),
    'apache': (r'apache|httpd', 'service', 'Apache'),
}


class ProjectScanner:
    def __init__(self, root: str):
        self.root = Path(root).resolve()
        self.components: List[Component] = []
        self.connections: List[Connection] = []
        self._seen_components: Set[Tuple] = set()
        self._id_map: Dict[str, str] = {}
        self._file_index: Dict[str, Component] = {}
        self._import_graph: Dict[str, Set[str]] = defaultdict(set)
        self._string_refs: Dict[str, List[Tuple[str, str, int]]] = defaultdict(list)

    def _add_component(self, comp: Component) -> Optional[Component]:
        key = (comp.type, comp.technology, comp.name, comp.file)
        if key in self._seen_components:
            return None
        self._seen_components.add(key)
        self.components.append(comp)
        self._file_index[comp.file] = comp
        return comp

    def _connect(self, source: str, target: str, type: str, confidence: float = 0.8, evidence: str = ''):
        if source == target:
            return
        exists = any(
            (c.source == source and c.target == target and c.type == type)
            for c in self.connections
        )
        if not exists:
            self.connections.append(Connection(
                source=source, target=target, type=type,
                confidence=confidence, evidence=evidence
            ))

    def _rel_path(self, file: Path) -> str:
        try:
            return str(file.relative_to(self.root))
        except ValueError:
            return str(file)

    def _safe_name(self, name: str) -> str:
        return re.sub(r'[^a-zA-Z0-9_\-]', '_', name).strip('_') or 'unnamed'

    def _classify_file(self, path: Path) -> Optional[str]:
        name = path.name.lower()
        ext = path.suffix.lower()
        
        if name in BUILD_EXT:
            return 'build'
        if ext in CONFIG_EXT:
            return 'config'
        if ext in DATA_EXT:
            return 'data'
        if ext in DOCS_EXT:
            return 'docs'
        if ext in ASSETS_EXT:
            return 'assets'
        if ext in SOURCE_EXT:
            return 'source'
        if any(p in name for p in TEST_PATTERNS):
            return 'test'
        if 'test' in path.parts or 'spec' in path.parts:
            return 'test'
        if 'migration' in path.parts or 'migrate' in path.parts:
            return 'data'
        return None

    def _extract_module_name(self, path: Path) -> str:
        rel = self._rel_path(path)
        parts = rel.replace('\\', '/').split('/')
        if len(parts) > 1:
            return parts[-2] + '/' + path.stem
        return path.stem

    def scan(self) -> Dict[str, Any]:
        if not self.root.exists() or not self.root.is_dir():
            return {"error": f"Invalid project path: {self.root}"}

        files = self._walk_files()
        self._first_pass(files)
        self._trace_imports(files)
        self._trace_strings(files)
        self._trace_html_refs(files)
        self._trace_external_urls(files)
        self._trace_config_refs(files)
        self._infer_file_connections()
        self._infer_type_connections()

        return {
            "project": self.root.name,
            "path": str(self.root),
            "components": [c.to_dict() for c in self.components],
            "connections": [c.to_dict() for c in self.connections],
        }

    def _walk_files(self) -> List[Path]:
        files = []
        for dirpath, dirnames, filenames in os.walk(self.root):
            dirnames[:] = [d for d in dirnames if d not in IGNORED_DIRS]
            for fn in filenames:
                p = Path(dirpath) / fn
                if self._classify_file(p):
                    files.append(p)
        return files

    def _read_file(self, path: Path) -> Optional[str]:
        try:
            return path.read_text(encoding='utf-8', errors='ignore')
        except Exception:
            return None

    def _first_pass(self, files: List[Path]):
        for path in files:
            text = self._read_file(path)
            if not text:
                continue
            rel = self._rel_path(path)
            ftype = self._classify_file(path)
            if not ftype:
                continue

            if ftype == 'build':
                self._scan_build(path, text, rel)
            elif ftype == 'config':
                self._scan_config(path, text, rel)
            elif ftype == 'source':
                self._scan_source(path, text, rel)
            elif ftype == 'test':
                self._scan_test(path, text, rel)
            elif ftype == 'data':
                self._scan_data(path, text, rel)
            elif ftype == 'docs':
                self._scan_docs(path, text, rel)

    def _scan_build(self, path: Path, text: str, rel: str):
        name = path.name
        tech = 'generic'
        ctype = 'service'
        
        if name == 'docker-compose.yml' or name == 'docker-compose.yaml':
            ctype = 'service'
            tech = 'docker-compose'
            for m in re.finditer(r'image:\s*([^\s]+)', text):
                image = m.group(1)
                svc = Component(
                    id=f"svc_{len(self.components)+1}",
                    type='service',
                    name=image,
                    technology='docker',
                    file=rel,
                    line=text[:m.start()].count('\n') + 1,
                    description=f"Docker image: {image}",
                    metadata={'image': image, 'build_type': 'docker-compose'},
                )
                self._add_component(svc)
            for m in re.finditer(r'build:\s*([^\s]+)', text):
                build_ctx = m.group(1)
                svc = Component(
                    id=f"svc_{len(self.components)+1}",
                    type='build',
                    name=f"Build: {build_ctx}",
                    technology='docker',
                    file=rel,
                    line=text[:m.start()].count('\n') + 1,
                    description=f"Docker build context: {build_ctx}",
                    metadata={'build_context': build_ctx},
                )
                self._add_component(svc)
            for m in re.finditer(r'ports:\s*\n\s*- ["\']?(\d+)', text):
                port = m.group(1)
                svc = Component(
                    id=f"svc_{len(self.components)+1}",
                    type='service',
                    name=f"Port {port}",
                    technology='network',
                    file=rel,
                    line=text[:m.start()].count('\n') + 1,
                    description=f"Exposed port: {port}",
                    metadata={'port': port},
                )
                self._add_component(svc)
            return

        if name == 'makefile' or name.startswith('makefile.'):
            ctype = 'build'
            tech = 'make'
        elif name == 'dockerfile':
            ctype = 'build'
            tech = 'docker'
        elif name == 'vagrantfile':
            ctype = 'service'
            tech = 'vagrant'
        elif name == 'terraform':
            ctype = 'cloud'
            tech = 'terraform'
        elif name == 'pom.xml':
            ctype = 'build'
            tech = 'maven'
        elif 'build.gradle' in name:
            ctype = 'build'
            tech = 'gradle'
        elif name == 'cargo.toml':
            ctype = 'build'
            tech = 'cargo'
        elif name == 'go.mod':
            ctype = 'build'
            tech = 'go-modules'
        elif name == 'package.json':
            ctype = 'build'
            tech = 'npm'
        elif name == 'requirements.txt':
            ctype = 'build'
            tech = 'pip'
        elif name == 'pyproject.toml':
            ctype = 'build'
            tech = 'python-build'
        elif name == 'setup.py' or name == 'setup.cfg':
            ctype = 'build'
            tech = 'python-setup'
        elif name == 'gemfile':
            ctype = 'build'
            tech = 'ruby-bundler'

        desc = f"Build file: {name}"
        if name == 'dockerfile':
            m = re.search(r'FROM\s+([^\s]+)', text)
            if m:
                desc = f"Docker base image: {m.group(1)}"
                tech = 'docker'
        elif name == 'makefile' or name.startswith('makefile'):
            targets = re.findall(r'^([a-zA-Z_][a-zA-Z0-9_-]*):', text, re.MULTILINE)
            if targets:
                desc = f"Make targets: {', '.join(targets[:5])}"

        svc = Component(
            id=f"build_{len(self.components)+1}",
            type=ctype,
            name=name,
            technology=tech,
            file=rel,
            line=1,
            description=desc,
            metadata={'file': name},
        )
        self._add_component(svc)

    def _scan_config(self, path: Path, text: str, rel: str):
        name = path.name
        ext = path.suffix.lower()
        tech = 'config'
        ctype = 'config'
        desc = f"Config: {name}"

        if ext == '.json':
            tech = 'json'
            try:
                data = json.loads(text)
                if 'dependencies' in data or 'devDependencies' in data:
                    tech = 'npm'
                    deps = {**data.get('dependencies', {}), **data.get('devDependencies', {})}
                    desc = f"npm config: {', '.join(list(deps.keys())[:8])}"
                elif 'scripts' in data:
                    tech = 'npm'
                    desc = f"npm scripts: {', '.join(list(data['scripts'].keys())[:5])}"
            except json.JSONDecodeError:
                pass
        elif ext in {'.yaml', '.yml'}:
            tech = 'yaml'
            if 'github' in rel.lower() or 'workflow' in rel.lower():
                tech = 'github-actions'
                ctype = 'ci'
                desc = f"GitHub Actions workflow: {name}"
            elif 'gitlab' in rel.lower():
                tech = 'gitlab-ci'
                ctype = 'ci'
                desc = f"GitLab CI: {name}"
            elif 'kubernetes' in rel.lower() or 'k8s' in rel.lower():
                tech = 'kubernetes'
                ctype = 'service'
                m = re.search(r'kind:\s*([^\s]+)', text)
                if m:
                    desc = f"K8s {m.group(1)}: {name}"
            elif 'helm' in rel.lower():
                tech = 'helm'
                ctype = 'service'
                desc = f"Helm chart: {name}"
        elif ext == '.toml':
            tech = 'toml'
        elif ext == '.env' or name.startswith('.env'):
            tech = 'env'
            ctype = 'service'
            desc = f"Environment config: {name}"
        elif ext == '.properties':
            tech = 'java-props'
        elif ext == '.xml':
            tech = 'xml'
            if 'web' in rel.lower() or 'webapp' in rel.lower():
                tech = 'java-web'
                desc = f"Java web config: {name}"

        svc = Component(
            id=f"cfg_{len(self.components)+1}",
            type=ctype,
            name=name,
            technology=tech,
            file=rel,
            line=1,
            description=desc,
            metadata={'file': name},
        )
        self._add_component(svc)

    def _scan_source(self, path: Path, text: str, rel: str):
        ext = path.suffix.lower()
        module_name = self._extract_module_name(path)
        tech = self._detect_source_tech(text, ext)
        ctype = 'module'
        
        if tech in {'FastAPI', 'Flask', 'Django', 'Express', 'Koa', 'Fastify', 'NestJS', 'Spring', 'Gin', 'Echo'}:
            ctype = 'api'
        elif tech in {'GraphQL', 'gRPC'}:
            ctype = 'api'

        comp = Component(
            id=f"src_{len(self.components)+1}",
            type=ctype,
            name=module_name,
            technology=tech,
            file=rel,
            line=1,
            description=f"Source: {module_name}",
            metadata={'module': module_name, 'ext': ext},
        )
        self._add_component(comp)

        conn_patterns = [
            (r'(?:postgresql|postgres|psql)://', 'PostgreSQL', 'database', 'postgresql'),
            (r'(?:mysql|mariadb)://', 'MySQL', 'database', 'mysql'),
            (r'(?:mongodb|mongodb\+srv)://', 'MongoDB', 'database', 'mongodb'),
            (r'redis://|rediss://', 'Redis', 'queue', 'redis'),
            (r'(?:amqp|amqps)://', 'RabbitMQ', 'queue', 'rabbitmq'),
            (r'kafka://', 'Kafka', 'queue', 'kafka'),
            (r'(?:s3|s3\.amazonaws)://', 'AWS S3', 'cloud', 'aws'),
        ]
        for pattern, name, ctype, technology in conn_patterns:
            for m in re.finditer(pattern, text, re.IGNORECASE):
                conn_str = m.group(0)
                comp = Component(
                    id=f"conn_{len(self.components)+1}",
                    type=ctype,
                    name=name,
                    technology=technology,
                    file=rel,
                    line=text[:m.start()].count('\n') + 1,
                    description=f"Connection: {name}",
                    metadata={'connection_string': conn_str, 'source_file': rel},
                )
                added = self._add_component(comp)
                if added:
                    source_comp = self._file_index.get(rel)
                    if source_comp:
                        self._connect(source_comp.id, comp.id, 'uses', 0.9, f"connection string in {rel}")

    def _detect_source_tech(self, text: str, ext: str) -> str:
        text_lower = text.lower()
        if ext == '.py':
            if 'fastapi' in text_lower[:3000]:
                return 'FastAPI'
            if 'flask' in text_lower[:3000]:
                return 'Flask'
            if 'django' in text_lower[:3000]:
                return 'Django'
            return 'Python'
        elif ext in {'.js', '.ts', '.jsx', '.tsx'}:
            if 'react' in text_lower[:3000] or 'reactdom' in text_lower[:3000]:
                return 'React'
            if 'vue' in text_lower[:3000]:
                return 'Vue'
            if 'express' in text_lower[:3000]:
                return 'Express'
            if 'fastify' in text_lower[:3000]:
                return 'Fastify'
            if 'koa' in text_lower[:3000]:
                return 'Koa'
            if '@nestjs' in text_lower[:3000]:
                return 'NestJS'
            if 'next/' in text_lower or 'next.js' in text_lower:
                return 'Next.js'
            if 'svelte' in text_lower[:3000]:
                return 'Svelte'
            return 'JavaScript' if ext == '.js' else 'TypeScript'
        elif ext == '.go':
            if 'gin.' in text_lower or 'gin ' in text_lower:
                return 'Gin'
            if 'echo.' in text_lower:
                return 'Echo'
            if 'gorilla/mux' in text_lower:
                return 'Gorilla Mux'
            return 'Go'
        elif ext in {'.java', '.kt', '.kts'}:
            if 'springframework' in text_lower or '@SpringBoot' in text:
                return 'Spring'
            return 'Java' if ext == '.java' else 'Kotlin'
        elif ext == '.rs':
            return 'Rust'
        elif ext == '.rb':
            return 'Ruby'
        elif ext == '.php':
            return 'PHP'
        elif ext in {'.cs', '.cpp', '.c'}:
            return 'C#' if ext == '.cs' else ('C++' if ext == '.cpp' else 'C')
        elif ext == '.swift':
            return 'Swift'
        elif ext == '.dart':
            return 'Dart'
        return ext.replace('.', '').upper()

    def _scan_test(self, path: Path, text: str, rel: str):
        ext = path.suffix.lower()
        tech = self._detect_source_tech(text, ext)
        module_name = self._extract_module_name(path)
        
        comp = Component(
            id=f"test_{len(self.components)+1}",
            type='test',
            name=f"Test: {module_name}",
            technology=tech,
            file=rel,
            line=1,
            description=f"Test file: {module_name}",
            metadata={'module': module_name, 'ext': ext},
        )
        self._add_component(comp)

    def _scan_data(self, path: Path, text: str, rel: str):
        name = path.name
        ext = path.suffix.lower()
        ctype = 'data'
        tech = ext.replace('.', '')
        desc = f"Data file: {name}"

        if ext == '.sql':
            ctype = 'database'
            tech = 'sql'
            m = re.search(r'(create|alter|drop)\s+table\s+([^\s(]+)', text, re.IGNORECASE)
            if m:
                desc = f"SQL table: {m.group(2)}"
        elif ext in {'.csv', '.tsv'}:
            ctype = 'data'
            tech = 'csv'
            lines = text.strip().split('\n')
            if len(lines) > 0:
                headers = lines[0].split(',')
                desc = f"CSV: {len(headers)} columns, {len(lines)-1} rows"
        elif ext in {'.db', '.sqlite', '.sqlite3'}:
            ctype = 'database'
            tech = 'sqlite'
            desc = f"SQLite database: {name}"
        elif ext == '.parquet':
            ctype = 'data'
            tech = 'parquet'
            desc = f"Parquet data: {name}"

        comp = Component(
            id=f"data_{len(self.components)+1}",
            type=ctype,
            name=name,
            technology=tech,
            file=rel,
            line=1,
            description=desc,
            metadata={'file': name, 'ext': ext},
        )
        self._add_component(comp)

    def _scan_docs(self, path: Path, text: str, rel: str):
        name = path.name
        ext = path.suffix.lower()
        comp = Component(
            id=f"doc_{len(self.components)+1}",
            type='docs',
            name=name,
            technology=ext.replace('.', ''),
            file=rel,
            line=1,
            description=f"Documentation: {name}",
            metadata={'file': name},
        )
        self._add_component(comp)

    def _detect_tech_from_text(self, text: str) -> List[Tuple[str, str, str]]:
        found = []
        text_lower = text.lower()
        for tech, (pattern, ctype, label) in TECH_PATTERNS.items():
            if re.search(pattern, text, re.IGNORECASE):
                found.append((tech, ctype, label))
        return found

    def _trace_imports(self, files: List[Path]):
        import_patterns = {
            '.py': r'(?:from\s+([^\s]+)\s+import|import\s+([^\s]+))',
            '.js': r'(?:import\s+.*?from\s+[\'"]([^\'"]+)[\'"]|require\([\'"]([^\'"]+)[\'"]\))',
            '.ts': r'(?:import\s+.*?from\s+[\'"]([^\'"]+)[\'"]|require\([\'"]([^\'"]+)[\'"]\))',
            '.jsx': r'(?:import\s+.*?from\s+[\'"]([^\'"]+)[\'"]|require\([\'"]([^\'"]+)[\'"]\))',
            '.tsx': r'(?:import\s+.*?from\s+[\'"]([^\'"]+)[\'"]|require\([\'"]([^\'"]+)[\'"]\))',
            '.go': r'import\s+(?:\([^)]*\s+"([^"]+)"|"([^"]+)")',
            '.java': r'import\s+([^;]+);',
            '.kt': r'import\s+([^\s]+)',
            '.rs': r'use\s+([^;]+);',
            '.rb': r'(?:require\s+[\'"]([^\'"]+)[\'"]|require_relative\s+[\'"]([^\'"]+)[\'"]|from\s+([^\s]+)\s+include)',
            '.php': r'(?:use\s+([^\s;]+)|require_once\s+[\'"]([^\'"]+)[\'"]|include\s+[\'"]([^\'"]+)[\'"]|require\s+[\'"]([^\'"]+)[\'"]|include_once\s+[\'"]([^\'"]+)[\'"]|namespace\s+([^\s;]+))',
            '.cs': r'using\s+([^;]+);',
            '.cpp': r'#include\s+[<"]([^>"]+)[>"]',
            '.c': r'#include\s+[<"]([^>"]+)[>"]',
            '.swift': r'import\s+([^\s]+)',
        }

        for path in files:
            ext = path.suffix.lower()
            if ext not in import_patterns:
                continue
            text = self._read_file(path)
            if not text:
                continue
            rel = self._rel_path(path)
            pattern = import_patterns[ext]
            lines = text.splitlines()
            source_id = self._file_index.get(rel)
            if not source_id:
                continue
            source_id = source_id.id

            for i, line in enumerate(lines, 1):
                matches = re.findall(pattern, line)
                if not matches:
                    continue
                for match in matches:
                    if isinstance(match, tuple):
                        imp = next((m for m in match if m), '')
                    else:
                        imp = match
                    imp = imp.strip().strip('"').strip("'")
                    if not imp or imp.startswith('.'):
                        continue
                    self._import_graph[source_id].add(imp)
                    self._string_refs[imp].append((rel, 'import', i))

    def _trace_strings(self, files: List[Path]):
        url_pattern = re.compile(r'https?://[^\s"\'`)\]]+|wss?://[^\s"\'`)\]]+|grpc?://[^\s"\'`)\]]+')
        conn_pattern = re.compile(
            r'(?:postgresql|mysql|mongodb|redis|amqp|kafka|rabbitmq|mssql|oracle|sqlite)://[^\s"\'`)\]]+',
            re.IGNORECASE
        )
        host_pattern = re.compile(r'(?:localhost|127\.0\.0\.1|0\.0\.0\.0|10\.\d+\.\d+\.\d+|172\.(1[6-9]|2\d|3[01])\.\d+\.\d+|192\.168\.\d+\.\d+):\d+')

        for path in files:
            text = self._read_file(path)
            if not text:
                continue
            rel = self._rel_path(path)
            comp = self._file_index.get(rel)
            if not comp:
                continue

            lines = text.splitlines()
            for i, line in enumerate(lines, 1):
                for m in url_pattern.finditer(line):
                    url = m.group(0)
                    self._string_refs[url].append((rel, 'url', i))
                for m in conn_pattern.finditer(line):
                    conn = m.group(0)
                    self._string_refs[conn].append((rel, 'connection_string', i))
                for m in host_pattern.finditer(line):
                    host = m.group(0)
                    self._string_refs[host].append((rel, 'host', i))

    def _trace_external_urls(self, files: List[Path]):
        url_pattern = re.compile(r'https?://([^/\s"\'`)\]]+)(?:/[^\s"\'`)\]]*)?')
        for path in files:
            text = self._read_file(path)
            if not text:
                continue
            rel = self._rel_path(path)
            comp = self._file_index.get(rel)
            if not comp:
                continue
            lines = text.splitlines()
            for i, line in enumerate(lines, 1):
                for m in url_pattern.finditer(line):
                    host = m.group(1)
                    if host in {'cdn.jsdelivr.net', 'unpkg.com', 'cdnjs.cloudflare.com'}:
                        continue
                    ext_comp = Component(
                        id=f"ext_{len(self.components)+1}",
                        type='cloud',
                        name=host,
                        technology='external',
                        file=rel,
                        line=i,
                        description=f"External service: {host}",
                        metadata={'host': host, 'url': m.group(0)},
                    )
                    added = self._add_component(ext_comp)
                    if added:
                        self._connect(comp.id, added.id, 'calls', 0.85, f"URL in {rel}:{i}")

    def _trace_config_refs(self, files: List[Path]):
        env_vars = set()
        docker_services = {}
        current_service = None

        for path in files:
            text = self._read_file(path)
            if not text:
                continue
            rel = self._rel_path(path)
            name = path.name.lower()

            if name in {'docker-compose.yml', 'docker-compose.yaml'}:
                for m in re.finditer(r'^(\S+):', text, re.MULTILINE):
                    svc = m.group(1)
                    if svc in {'services', 'volumes', 'networks', 'configs', 'secrets'}:
                        continue
                    docker_services[svc] = rel
                    current_service = svc
                for m in re.finditer(r'image:\s*([^\s]+)', text):
                    image = m.group(1)
                    docker_services[image] = rel
                for m in re.finditer(r'ports:\s*\n\s*- ["\']?(\d+)', text):
                    port = m.group(1)
                    comp = self._file_index.get(rel)
                    if comp:
                        port_comp = Component(
                            id=f"port_{len(self.components)+1}",
                            type='service',
                            name=f"Port {port}",
                            technology='network',
                            file=rel,
                            line=text[:m.start()].count('\n') + 1,
                            description=f"Exposed port: {port}",
                            metadata={'port': port},
                        )
                        added = self._add_component(port_comp)
                        if added:
                            self._connect(comp.id, port_comp.id, 'exposes', 0.9, f"port mapping in {rel}")
                for m in re.finditer(r'build:\s*([^\s]+)', text):
                    build_ctx = m.group(1)
                    comp = self._file_index.get(rel)
                    if comp:
                        build_comp = Component(
                            id=f"build_{len(self.components)+1}",
                            type='build',
                            name=f"Build: {build_ctx}",
                            technology='docker',
                            file=rel,
                            line=text[:m.start()].count('\n') + 1,
                            description=f"Docker build context: {build_ctx}",
                            metadata={'build_context': build_ctx},
                        )
                        self._add_component(build_comp)
                continue

            for m in re.finditer(r'^([A-Z_][A-Z0-9_]*)=', text, re.MULTILINE):
                env_vars.add(m.group(1))

        for path in files:
            text = self._read_file(path)
            if not text:
                continue
            rel = self._rel_path(path)
            comp = self._file_index.get(rel)
            if not comp:
                continue

            lines = text.splitlines()
            for i, line in enumerate(lines, 1):
                for svc_name, svc_file in docker_services.items():
                    if svc_name in line and svc_name != 'services':
                        target_id = self._file_index[svc_file].id if svc_file in self._file_index else None
                        if target_id:
                            self._connect(
                                comp.id, target_id,
                                'references', 0.7,
                                f"docker-compose service reference: {svc_name}"
                            )
                for var in env_vars:
                    if re.search(r'\$\{' + re.escape(var) + r'\}|\$\{' + re.escape(var) + r'[^}]*\}', line):
                        for ref_rel, ref_type, ref_line in self._string_refs.get(var, []):
                            if ref_rel in self._file_index:
                                self._connect(
                                    comp.id, self._file_index[ref_rel].id,
                                    'configures', 0.8,
                                    f"env var {var} used in {rel}:{i}"
                                )

    def _trace_html_refs(self, files: List[Path]):
        html_patterns = {
            '.html': r'(?:src|href)\s*=\s*["\']([^"\']+)["\']',
            '.htm': r'(?:src|href)\s*=\s*["\']([^"\']+)["\']',
        }
        for path in files:
            ext = path.suffix.lower()
            if ext not in html_patterns:
                continue
            text = self._read_file(path)
            if not text:
                continue
            rel = self._rel_path(path)
            comp = self._file_index.get(rel)
            if not comp:
                continue
            pattern = html_patterns[ext]
            lines = text.splitlines()
            for i, line in enumerate(lines, 1):
                for m in re.finditer(pattern, line):
                    ref = m.group(1)
                    if ref.startswith(('http://', 'https://', '//')):
                        ext_comp = Component(
                            id=f"ext_{len(self.components)+1}",
                            type='cloud',
                            name=ref.split('/')[2],
                            technology='external',
                            file=rel,
                            line=i,
                            description=f"External URL: {ref}",
                            metadata={'url': ref},
                        )
                        added = self._add_component(ext_comp)
                        if added:
                            self._connect(comp.id, ext_comp.id, 'calls', 0.8, f"HTML reference in {rel}:{i}")
                    elif not ref.startswith(('#', 'data:', 'mailto:', 'tel:')):
                        ref_path = ref.split('?')[0]
                        target_rel = None
                        for f in self._file_index:
                            if f.endswith(ref_path) or f.endswith(ref_path.lstrip('./')):
                                target_rel = f
                                break
                        if target_rel and target_rel in self._file_index:
                            self._connect(
                                comp.id, self._file_index[target_rel].id,
                                'references', 0.9,
                                f"HTML ref in {rel}:{i} -> {ref_path}"
                            )

    def _infer_file_connections(self):
        for source_id, imports in self._import_graph.items():
            source_comp = None
            for c in self.components:
                if c.id == source_id:
                    source_comp = c
                    break
            if not source_comp:
                continue

            for imp in imports:
                imp_clean = imp.split('/')[0].split('.')[0]
                for target in self.components:
                    if target.id == source_id:
                        continue
                    target_name = target.name.split('/')[-1].split('.')[0]
                    if imp_clean == target_name or imp == target.file:
                        self._connect(
                            source_id, target.id, 'imports',
                            0.9, f"import statement: {imp}"
                        )
                        break
                else:
                    if imp not in {'http', 'https', 'fs', 'path', 'os', 'url', 'crypto', 'stream', 'util', 'events', 'buffer', 'querystring', 'zlib', 'net', 'tls', 'child_process', 'cluster', 'dgram', 'dns', 'readline', 'repl', 'vm', 'inspector', 'async_hooks', 'perf_hooks', 'trace_events', 'wasi', 'worker_threads'}:
                        ext_comp = Component(
                            id=f"lib_{len(self.components)+1}",
                            type='service',
                            name=imp.split('/').pop().split('@')[0],
                            technology='library',
                            file=source_comp.file,
                            line=1,
                            description=f"External library: {imp}",
                            metadata={'package': imp},
                        )
                        added = self._add_component(ext_comp)
                        if added:
                            self._connect(source_id, added.id, 'imports', 0.7, f"external import: {imp}")

        for source_id, imports in self._import_graph.items():
            source_comp = None
            for c in self.components:
                if c.id == source_id:
                    source_comp = c
                    break
            if not source_comp:
                continue

            serve_pattern = re.compile(r'(?:readFile|readFileSync|createReadStream|sendFile|static)\s*\(\s*(?:path\.join|__dirname)\s*\([^)]*\)\s*,\s*["\']([^"\']+)["\']', re.IGNORECASE)
            text = self._read_file(Path(source_comp.file))
            if text:
                for m in serve_pattern.finditer(text):
                    served_file = m.group(1)
                    for target in self.components:
                        if target.file.endswith(served_file) or target.name == served_file:
                            self._connect(
                                source_id, target.id, 'serves',
                                0.95, f"static file serve: {served_file}"
                            )
                            break

    def _infer_type_connections(self):
        by_type: Dict[str, List[str]] = {}
        for c in self.components:
            by_type.setdefault(c.type, []).append(c.id)

        for c in self.components:
            if c.type == 'test':
                test_name = c.name.replace('Test:', '').strip().lower()
                for target in self.components:
                    if target.type != 'module':
                        continue
                    target_name = target.name.split('/')[-1].lower()
                    if test_name == target_name or test_name in target_name or target_name in test_name:
                        self._connect(c.id, target.id, 'tests', 0.7, f"test/module name similarity")

        for c in self.components:
            if c.type == 'config' and c.technology in {'env', 'yaml', 'json'}:
                for target in self.components:
                    if target.type == 'service':
                        self._connect(c.id, target.id, 'configures', 0.5, f"config/service type inference")
                    if target.type == 'module' and c.technology == 'env':
                        self._connect(c.id, target.id, 'configures', 0.4, f"env/module inference")

        for c in self.components:
            if c.type == 'build' and c.technology == 'docker':
                for target in self.components:
                    if target.type == 'service' and target.technology == 'docker':
                        self._connect(c.id, target.id, 'builds', 0.6, f"docker build/service relationship")

    def _get_component_id(self, rel_path: str) -> Optional[str]:
        comp = self._file_index.get(rel_path)
        return comp.id if comp else None


def scan_project(root: str) -> Dict[str, Any]:
    scanner = ProjectScanner(root)
    return scanner.scan()


def main():
    if len(sys.argv) < 2:
        print(json.dumps({"error": "Usage: scanner.py <project_path>"}))
        sys.exit(1)

    project_path = sys.argv[1]
    scanner = ProjectScanner(project_path)
    result = scanner.scan()
    print(json.dumps(result, indent=2))


if __name__ == '__main__':
    main()
