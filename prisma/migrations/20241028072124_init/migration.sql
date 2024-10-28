-- CreateTable
CREATE TABLE "RouterInfo" (
    "id" SERIAL NOT NULL,
    "timestamp" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "params" TEXT NOT NULL,
    "factoryAddr" TEXT NOT NULL,
    "feeAddr" TEXT NOT NULL,
    "recipient" TEXT NOT NULL,
    "routerAddr" TEXT NOT NULL,

    CONSTRAINT "RouterInfo_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "RouterInfo_routerAddr_key" ON "RouterInfo"("routerAddr");
