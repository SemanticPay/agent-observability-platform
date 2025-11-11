from abc import ABC, abstractmethod

class BaseDatabase(ABC):
    @abstractmethod
    def connect(self):
        pass

    @abstractmethod
    def disconnect(self):
        pass

