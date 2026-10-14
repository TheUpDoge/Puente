package app.puente

import android.content.Context
import android.view.LayoutInflater
import android.view.View
import android.view.ViewGroup
import android.widget.TextView
import androidx.core.content.ContextCompat
import androidx.recyclerview.widget.RecyclerView

/** One finished utterance. [translation] and [notes] fill in a moment after the line appears. */
class Line(val lang: Lang, val original: String) {
    var translation: String? = null
    var notes: List<String> = emptyList()
}

class LineAdapter(private val context: Context) : RecyclerView.Adapter<LineAdapter.VH>() {

    private val lines = ArrayList<Line>()

    class VH(v: View) : RecyclerView.ViewHolder(v) {
        val tag: TextView = v.findViewById(R.id.tvTag)
        val big: TextView = v.findViewById(R.id.tvBig)
        val small: TextView = v.findViewById(R.id.tvSmall)
        val notes: TextView = v.findViewById(R.id.tvNotes)
    }

    override fun onCreateViewHolder(parent: ViewGroup, viewType: Int): VH =
        VH(LayoutInflater.from(parent.context).inflate(R.layout.item_line, parent, false))

    override fun getItemCount(): Int = lines.size

    override fun onBindViewHolder(holder: VH, position: Int) {
        val line = lines[position]
        holder.tag.text = context.getString(
            R.string.tag_format,
            line.lang.code.uppercase(),
            line.lang.other.code.uppercase(),
        )
        holder.tag.setTextColor(
            ContextCompat.getColor(context, if (line.lang == Lang.EN) R.color.lang_en else R.color.lang_es),
        )
        holder.big.text = line.translation ?: context.getString(R.string.translating)
        holder.small.text = line.original
        if (line.notes.isEmpty()) {
            holder.notes.visibility = View.GONE
        } else {
            holder.notes.visibility = View.VISIBLE
            holder.notes.text = line.notes.joinToString("\n")
        }
    }

    fun add(line: Line) {
        lines.add(line)
        notifyItemInserted(lines.size - 1)
        if (lines.size > MAX_LINES) {
            lines.removeAt(0)
            notifyItemRemoved(0)
        }
    }

    fun refresh(line: Line) {
        val i = lines.indexOf(line)
        if (i >= 0) notifyItemChanged(i)
    }

    private companion object {
        const val MAX_LINES = 200
    }
}
