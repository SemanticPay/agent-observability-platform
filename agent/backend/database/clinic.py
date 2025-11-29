from typing import Optional
from agent.backend.database.base import BaseDatabase
from agent.backend.types.types import Clinic


class MockClinicDatabase(BaseDatabase): 
    def __init__(self):
        self._clinics = [
            Clinic(
                id="1",
                name="Clínica São Paulo - Vila Mariana",
                address="Rua Domingos de Morais, 2564 - Vila Mariana, São Paulo - SP",
                latitude=-23.5989,
                longitude=-46.6345,
                exam_types=["medical", "driving"]
            ),
            Clinic(
                id="2",
                name="Centro Médico Paulista - Moema",
                address="Av. Moema, 170 - Moema, São Paulo - SP",
                latitude=-23.6011,
                longitude=-46.6624,
                exam_types=["medical"]
            ),
            Clinic(
                id="3",
                name="Clínica Auto Escola - Ipiranga",
                address="Rua Silva Bueno, 1822 - Ipiranga, São Paulo - SP",
                latitude=-23.5943,
                longitude=-46.6084,
                exam_types=["driving"]
            ),
            Clinic(
                id="4",
                name="Exames Rápidos - Paraíso",
                address="Rua Vergueiro, 1421 - Paraíso, São Paulo - SP",
                latitude=-23.5777,
                longitude=-46.6398,
                exam_types=["medical", "driving"]
            ),
            Clinic(
                id="5",
                name="Clínica Saúde Total - Vila Mariana",
                address="Rua França Pinto, 498 - Vila Mariana, São Paulo - SP",
                latitude=-23.5912,
                longitude=-46.6389,
                exam_types=["medical"]
            ),
        ]
        self.next_id = 6

    def connect(self):
        """Connect to the mock database (no-op for mock)."""
        print("Connected to MockClinicDatabase")

    def disconnect(self):
        """Disconnect from the mock database (no-op for mock)."""
        print("Disconnected from MockClinicDatabase")

    def create_clinic(self, clinic: Clinic) -> Clinic:
        """Create a new clinic and return the clinic with its assigned ID."""
        clinic_id = str(self.next_id)
        self.next_id += 1
        clinic.id = clinic_id
        
        self._clinics.append(clinic)
        return clinic

    def get_clinic(self, clinic_id: str) -> Optional[Clinic]:
        """Retrieve a clinic by its ID. Returns None if not found."""
        for clinic in self._clinics:
            if clinic.id == clinic_id:
                return clinic
        return None

    def get_all_clinics(self) -> list[Clinic]:
        """Retrieve all clinics."""
        return self._clinics
