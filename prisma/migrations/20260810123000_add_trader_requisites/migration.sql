CREATE TABLE "TraderRequisite" (
    "traderId" TEXT NOT NULL,
    "requisiteId" TEXT NOT NULL,
    CONSTRAINT "TraderRequisite_pkey" PRIMARY KEY ("traderId","requisiteId")
);
ALTER TABLE "TraderRequisite" ADD CONSTRAINT "TraderRequisite_traderId_fkey" FOREIGN KEY ("traderId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "TraderRequisite" ADD CONSTRAINT "TraderRequisite_requisiteId_fkey" FOREIGN KEY ("requisiteId") REFERENCES "Requisite"("id") ON DELETE CASCADE ON UPDATE CASCADE;