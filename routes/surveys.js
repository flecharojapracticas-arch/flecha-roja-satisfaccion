// routes/surveys.js

const express = require("express")
const router = express.Router()
const { ObjectId } = require("mongodb")

// RUTA GET (Lectura y Filtrado) - SIN AUTENTICACIÓN
router.get("/", async (req, res) => {
  try {
    const filters = {}

    // 1. Filtro por Folio de Boleto o Clave de Encuestador
    if (req.query.search) {
      filters.$or = [
        { folioBoleto: { $regex: req.query.search, $options: "i" } },
        { claveEncuestador: { $regex: req.query.search, $options: "i" } },
      ]
    }

    // 2. Filtro por Terminal (origenViaje)
    if (req.query.filterTerminal) {
      filters.origenViaje = req.query.filterTerminal
    }

    // 3. Filtro por Destino (destinoFinal)
    if (req.query.filterDestino) {
      filters.destinoFinal = req.query.filterDestino
    }

    // 4. Filtro por Experiencia (cumplioExpectativas)
    if (req.query.filterExpectativa) {
      filters.cumplioExpectativas = req.query.filterExpectativa
    }

    const surveys = await req.db.collection(req.COLLECTION_NAME).find(filters).toArray()

    res.json(surveys)
  } catch (error) {
    console.error("Error al obtener encuestas:", error)
    res.status(500).json({ message: "Error interno del servidor al cargar datos" })
  }
})

// RUTA PUT (Actualizar/Validar/No Validar) - AHORA SIN AUTENTICACIÓN
router.put("/:id", async (req, res) => {
  const updates = req.body

  // Si la solicitud es para "No Validar" y se pide ELIMINACIÓN PERMANENTE
  if (updates.validado === "ELIMINADO_Y_BORRAR") {
    try {
      const result = await req.db.collection(req.COLLECTION_NAME).deleteOne({ _id: new ObjectId(req.params.id) })
      if (result.deletedCount === 0) return res.status(404).json({ message: "Encuesta no encontrada para eliminar" })
      return res.json({ message: "Encuesta eliminada correctamente" })
    } catch (error) {
      console.error("Error al eliminar:", error)
      return res.status(500).json({ message: "Error al intentar eliminar la encuesta" })
    }
  }

  // Para cualquier otra actualización (Validar, ELIMINADO lógico, o editar campos)
  try {
    // Excluir _id de las actualizaciones por seguridad
    delete updates._id

    const result = await req.db
      .collection(req.COLLECTION_NAME)
      .updateOne({ _id: new ObjectId(req.params.id) }, { $set: updates })
    if (result.matchedCount === 0) return res.status(404).json({ message: "Encuesta no encontrada" })
    res.json({ message: "Encuesta actualizada correctamente" })
  } catch (error) {
    console.error("Error al actualizar:", error)
    res.status(500).json({ message: "Error al actualizar" })
  }
})

module.exports = router
