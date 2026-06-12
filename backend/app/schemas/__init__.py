from app.schemas.certification import CertificationCreate, CertificationResponse, CertificationUpdate
from app.schemas.common import PaginatedResponse, ResponseModel
from app.schemas.design import DesignFileCreate, DesignFileResponse, DesignFileUpdate
from app.schemas.firmware import (
    FirmwareUpgradeTaskCreate,
    FirmwareUpgradeTaskResponse,
    FirmwareUpgradeTaskUpdate,
    FirmwareVersionCreate,
    FirmwareVersionResponse,
)
from app.schemas.product import ProductCreate, ProductResponse, ProductUpdate
from app.schemas.project import ProjectCreate, ProjectResponse, ProjectTaskCreate, ProjectTaskResponse
from app.schemas.supplier import (
    OutsourceTaskCreate,
    OutsourceTaskResponse,
    OutsourceTaskReview,
    OutsourceTaskUpdate,
    SupplierCreate,
    SupplierResponse,
    SupplierUpdate,
)
from app.schemas.user import UserCreate, UserResponse, UserUpdate
