-- AlterTable
ALTER TABLE "ownership_registry" ADD COLUMN "owner_entity_id" UUID,
ADD CONSTRAINT "ownership_registry_owner_entity_id_fkey" FOREIGN KEY ("owner_entity_id") REFERENCES "entities" ("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- CreateIndex
CREATE INDEX "ownership_registry_owner_entity_id_idx" ON "ownership_registry"("owner_entity_id");
